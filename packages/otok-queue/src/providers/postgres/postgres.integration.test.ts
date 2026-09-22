import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { resolveQueueRetry } from "../../utils.js";
import { migratePostgresQueueSchema } from "./migrate.js";
import { createPostgresQueueProvider } from "./store.js";
import { DEAD_LETTER_TABLE, IDEMPOTENCY_TABLE, JOBS_TABLE, type QueueDatabase } from "./schema.js";

const databaseUrl = process.env.OTOK_QUEUE_PG_TEST_URL;

function makeProvider(
  db: Kysely<QueueDatabase>,
  overrides: Partial<{ leaseMs: number; retry: ReturnType<typeof resolveQueueRetry> }> = {},
) {
  return createPostgresQueueProvider(db, {
    type: "postgres",
    retry: overrides.retry ?? resolveQueueRetry({ initialBackoffMs: 5, maxBackoffMs: 50, maxAttempts: 3 }),
    leaseMs: overrides.leaseMs,
  });
}

describe.skipIf(!databaseUrl)("postgres queue integration", () => {
  const hookTimeout = 60_000;
  let db: Kysely<QueueDatabase>;
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    db = new Kysely<QueueDatabase>({ dialect: new PostgresDialect({ pool }) });
    await migratePostgresQueueSchema(db, "down");
    await migratePostgresQueueSchema(db, "up");
  }, hookTimeout);

  afterEach(async () => {
    await sql`TRUNCATE otok_queue_jobs, otok_queue_dead_letter, otok_queue_cron_dedupe, otok_idempotency_records`.execute(
      db,
    );
  });

  afterAll(async () => {
    await db?.destroy().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }, hookTimeout);

  it("claims jobs exclusively across two workers", async () => {
    const provider = makeProvider(db, { leaseMs: 5_000 });
    await provider.enqueue("ping", { n: 1 });
    await provider.enqueue("ping", { n: 2 });

    const [a, b] = await Promise.all([provider.claim(1, { workerId: "w1" }), provider.claim(1, { workerId: "w2" })]);

    expect(a.length + b.length).toBe(2);
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });

  it("rejects complete after lease token mismatch", async () => {
    const provider = makeProvider(db);
    await provider.enqueue("once", { id: randomUUID() });
    const [job] = await provider.claim(1, { workerId: "owner" });
    await expect(provider.complete(job!.id, randomUUID())).rejects.toThrow(/lease/i);
  });

  it("dedupes enqueue idempotency keys", async () => {
    const provider = makeProvider(db);
    const first = await provider.enqueue("dedupe", { x: 1 }, { idempotencyKey: "k1", idempotencyScope: "test" });
    const second = await provider.enqueue("dedupe", { x: 2 }, { idempotencyKey: "k1", idempotencyScope: "test" });
    expect(second.id).toBe(first.id);
  });

  it("reclaims jobs after lease expiry", async () => {
    const provider = makeProvider(db, { leaseMs: 1 });
    await provider.enqueue("reclaim", { ok: true });
    const [job] = await provider.claim(1, { workerId: "slow" });
    await new Promise((r) => setTimeout(r, 50));
    const reclaimed = await provider.claim(1, { workerId: "fast" });
    expect(reclaimed[0]?.id).toBe(job!.id);
  });

  it("survives worker restart: pending jobs remain after pool reconnect", async () => {
    const provider = makeProvider(db);
    const enqueued = await provider.enqueue("persist", { v: 1 });
    const restartPool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    const restartDb = new Kysely<QueueDatabase>({ dialect: new PostgresDialect({ pool: restartPool }) });
    try {
      const provider2 = makeProvider(restartDb);
      const [job] = await provider2.claim(1, { workerId: "after-restart" });
      expect(job?.id).toBe(enqueued.id);
      await provider2.complete(job!.id, job!.leaseToken);
    } finally {
      await restartDb.destroy();
      await restartPool.end();
    }
  });

  it("applies retry backoff then dead-letters at maxAttempts", async () => {
    const provider = makeProvider(db, {
      retry: resolveQueueRetry({ maxAttempts: 2, initialBackoffMs: 10, maxBackoffMs: 30 }),
    });
    await provider.enqueue("fail-me", { x: 1 });
    const [first] = await provider.claim(1, { workerId: "w" });
    const t0 = Date.now();
    await provider.fail(first!.id, "boom", true, first!.leaseToken);
    await new Promise((r) => setTimeout(r, 15));
    const [second] = await provider.claim(1, { workerId: "w" });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(8);
    expect(second!.attempts).toBe(2);
    await provider.fail(second!.id, "boom again", true, second!.leaseToken);
    const dl = await db.selectFrom(DEAD_LETTER_TABLE).selectAll().execute();
    expect(dl).toHaveLength(1);
    const jobs = await db.selectFrom(JOBS_TABLE).selectAll().execute();
    expect(jobs).toHaveLength(0);
  });

  it("dedupes duplicate cron ticks for the same UTC minute", async () => {
    const provider = makeProvider(db);
    await provider.registerCron!({
      name: "hourly",
      cron: "* * * * *",
      jobName: "cron-job",
      payload: { tick: 1 },
    });
    const when = new Date("2026-06-01T10:15:00.000Z");
    const a = await provider.tickCron!(when);
    const b = await provider.tickCron!(when);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
    const jobs = await db.selectFrom(JOBS_TABLE).selectAll().execute();
    expect(jobs).toHaveLength(1);
  });

  it("keeps HTTP idempotency rows separate from job dedupe keys", async () => {
    const provider = makeProvider(db);
    await provider.enqueue("job", { n: 1 }, { idempotencyKey: "job-key", idempotencyScope: "jobs" });
    const storageKey = "POST:/api/pay:idem-1";
    await db
      .insertInto(IDEMPOTENCY_TABLE)
      .values({
        storage_key: storageKey,
        fingerprint: "fp-1",
        state: "completed",
        response_body: Buffer.from('{"ok":true}'),
        response_meta: { status: 200, statusText: "OK", headers: [] },
        expires_at: new Date(Date.now() + 86_400_000),
        updated_at: new Date(),
      })
      .execute();
    const idem = await db
      .selectFrom(IDEMPOTENCY_TABLE)
      .selectAll()
      .where("storage_key", "=", storageKey)
      .executeTakeFirst();
    expect(idem?.state).toBe("completed");
    const jobs = await db.selectFrom(JOBS_TABLE).selectAll().execute();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.idempotency_key).toBe("job-key");
    expect(jobs[0]?.idempotency_scope).toBe("jobs");
  });
});
