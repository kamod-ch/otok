import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Kysely, PostgresDialect, SqliteDialect, sql } from "kysely";
import pg from "pg";
import type { OutboxStore } from "../../types.js";
import { OutboxLeaseError } from "../../types.js";
import { OUTBOX_TABLE, type EventsDatabase } from "../types.js";
import { createKyselyOutboxStore, migrateEventsSchema } from "./store.js";

const pgUrl = process.env.OTOK_EVENTS_PG_TEST_URL;
const requireDatabaseTests = process.env.OTOK_REQUIRE_DATABASE_TESTS === "1";
const runSqlite = process.env.KYSELY_SQLITE_TESTS === "1";

if (requireDatabaseTests && !pgUrl) {
  throw new Error(
    "OTOK_REQUIRE_DATABASE_TESTS=1 but OTOK_EVENTS_PG_TEST_URL is missing. Point it at a disposable Postgres database used only for otok-events outbox integration tests.",
  );
}

/** Compile-time fixture: legacy custom stores stay valid without leased methods. */
const legacyStoreFixture: OutboxStore = {
  insert: async () => undefined,
  claimPending: async () => [],
  markPublished: async () => undefined,
  markFailed: async () => undefined,
  markDead: async () => undefined,
};

async function seedPending(
  store: ReturnType<typeof createKyselyOutboxStore>,
  count: number,
  prefix = "evt",
  at: Date = new Date(0),
): Promise<string[]> {
  const ids: string[] = [];
  const now = at.toISOString();
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    ids.push(id);
    await store.insert({
      id,
      eventName: `${prefix}.test`,
      eventVersion: 1,
      payload: { n: i },
      metadata: { correlationId: randomUUID() },
      availableAt: now,
      createdAt: now,
    });
  }
  return ids;
}

describe("legacy OutboxStore type fixture", () => {
  it("accepts stores without leased capability", () => {
    expect(legacyStoreFixture.claimPending).toBeTypeOf("function");
  });
});

describe.skipIf(!runSqlite)("sqlite outbox leased store", () => {
  const hookTimeout = 60_000;
  let dir: string;
  let dbPath: string;
  let db1: Kysely<EventsDatabase>;
  let db2: Kysely<EventsDatabase>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "otok-events-outbox-"));
    dbPath = join(dir, "outbox.sqlite");
    const { default: Database } = await import("better-sqlite3");
    const sqlite1 = new Database(dbPath);
    const sqlite2 = new Database(dbPath);
    for (const conn of [sqlite1, sqlite2]) {
      conn.pragma("journal_mode = WAL");
      conn.pragma("busy_timeout = 10000");
    }
    db1 = new Kysely({ dialect: new SqliteDialect({ database: sqlite1 }) });
    db2 = new Kysely({ dialect: new SqliteDialect({ database: sqlite2 }) });
    await migrateEventsSchema(db1, "sqlite");
    await migrateEventsSchema(db1, "sqlite");
  }, hookTimeout);

  afterEach(async () => {
    await sql`DELETE FROM ${sql.table(OUTBOX_TABLE)}`.execute(db1);
  });

  afterAll(() => {
    void db1?.destroy().catch(() => undefined);
    void db2?.destroy().catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
  }, hookTimeout);

  it("claims disjoint rows across two connections", async () => {
    const store1 = createKyselyOutboxStore(db1, "sqlite");
    const store2 = createKyselyOutboxStore(db2, "sqlite");
    await seedPending(store1, 4);

    const a = await store1.claimLeased(2);
    const b = await store2.claimLeased(2);
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
    const allIds = [...a, ...b].map((r) => r.id);
    expect(new Set(allIds).size).toBe(4);
    for (const row of [...a, ...b]) {
      expect(row.attempts).toBe(1);
      expect(row.leaseToken).toBeTruthy();
    }
  });

  it("reclaims expired leases with new tokens", async () => {
    const store = createKyselyOutboxStore(db1, "sqlite");
    await seedPending(store, 1);
    const claimAt = new Date(1_000);
    const [first] = await store.claimLeased(1, claimAt, 1);
    expect(first).toBeDefined();

    const later = new Date(2_000);
    const [reclaimed] = await store.claimLeased(1, later, 5_000);
    expect(reclaimed?.id).toBe(first!.id);
    expect(reclaimed?.leaseToken).not.toBe(first!.leaseToken);
    expect(reclaimed?.attempts).toBe(2);
  });

  it("rejects tokenless markPublished on active lease", async () => {
    const store = createKyselyOutboxStore(db1, "sqlite");
    await seedPending(store, 1);
    const [claimed] = await store.claimLeased(1);
    await expect(store.markPublished(claimed!.id)).rejects.toBeInstanceOf(OutboxLeaseError);
  });

  it("ignores stale lease token on completion", async () => {
    const store = createKyselyOutboxStore(db1, "sqlite");
    await seedPending(store, 1);
    const [first] = await store.claimLeased(1, new Date(1_000), 1);
    const [reclaimed] = await store.claimLeased(1, new Date(2_000), 5_000);
    await expect(store.markPublishedLeased(first!.id, first!.leaseToken)).rejects.toBeInstanceOf(OutboxLeaseError);
    await store.markPublishedLeased(reclaimed!.id, reclaimed!.leaseToken);
  });
});

describe.skipIf(!pgUrl)("postgres outbox leased store", () => {
  const hookTimeout = 60_000;
  let pool1: pg.Pool;
  let pool2: pg.Pool;
  let db1: Kysely<EventsDatabase>;
  let db2: Kysely<EventsDatabase>;

  beforeAll(async () => {
    pool1 = new pg.Pool({ connectionString: pgUrl, connectionTimeoutMillis: 5_000 });
    pool2 = new pg.Pool({ connectionString: pgUrl, connectionTimeoutMillis: 5_000 });
    db1 = new Kysely({ dialect: new PostgresDialect({ pool: pool1 }) });
    db2 = new Kysely({ dialect: new PostgresDialect({ pool: pool2 }) });
    await migrateEventsSchema(db1, "postgres");
    await migrateEventsSchema(db1, "postgres");
  }, hookTimeout);

  afterEach(async () => {
    await sql`TRUNCATE ${sql.table(OUTBOX_TABLE)}`.execute(db1);
  });

  afterAll(async () => {
    await db1?.destroy().catch(() => undefined);
    await db2?.destroy().catch(() => undefined);
    await pool1?.end().catch(() => undefined);
    await pool2?.end().catch(() => undefined);
  }, hookTimeout);

  it("claims disjoint rows across two pools", async () => {
    const store1 = createKyselyOutboxStore(db1, "postgres");
    const store2 = createKyselyOutboxStore(db2, "postgres");
    await seedPending(store1, 3);

    const [a, b] = await Promise.all([store1.claimLeased(2), store2.claimLeased(2)]);
    expect(a.length + b.length).toBe(3);
    const ids = [...a, ...b].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects stale lease token on markFailedLeased", async () => {
    const store = createKyselyOutboxStore(db1, "postgres");
    await seedPending(store, 1);
    const [first] = await store.claimLeased(1, new Date(0), 1);
    await store.claimLeased(1, new Date(10), 5_000);
    await expect(
      store.markFailedLeased(first!.id, first!.leaseToken, "err", new Date().toISOString()),
    ).rejects.toBeInstanceOf(OutboxLeaseError);
  });
});
