import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { defineWorkflow, z } from "../../define-workflow.js";
import { WorkflowEngine } from "../../engine.js";
import {
  createKyselyWorkflowStore,
  migrateWorkflowsSchema,
  INSTANCES_TABLE,
  STEPS_TABLE,
  DEAD_LETTER_TABLE,
  CRON_DEDUPE_TABLE,
  type WorkflowsDatabase,
} from "./store.js";

const databaseUrl = process.env.OTOK_WORKFLOWS_PG_TEST_URL;
const requireDatabaseTests = process.env.OTOK_REQUIRE_DATABASE_TESTS === "1";

if (requireDatabaseTests && !databaseUrl) {
  throw new Error(
    "OTOK_REQUIRE_DATABASE_TESTS=1 but OTOK_WORKFLOWS_PG_TEST_URL is missing. Point it at a disposable Postgres database used only for workflow lease integration tests.",
  );
}

function createGate() {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { gate, open };
}

describe.skipIf(!databaseUrl)("postgres workflow lease integration", () => {
  const hookTimeout = 60_000;
  let db: Kysely<WorkflowsDatabase>;
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    db = new Kysely<WorkflowsDatabase>({ dialect: new PostgresDialect({ pool }) });
    await migrateWorkflowsSchema(db, "postgres");
  }, hookTimeout);

  afterEach(async () => {
    await sql`TRUNCATE ${sql.table(DEAD_LETTER_TABLE)}, ${sql.table(STEPS_TABLE)}, ${sql.table(CRON_DEDUPE_TABLE)}, ${sql.table(INSTANCES_TABLE)} CASCADE`.execute(
      db,
    );
  });

  afterAll(async () => {
    await db?.destroy().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }, hookTimeout);

  it("reclaims expired lease for a second worker", async () => {
    const store = createKyselyWorkflowStore(db, { dialect: "postgres" });
    await store.createInstance({
      id: randomUUID(),
      workflowName: "pg.reclaim",
      status: "pending",
      input: {},
      progress: 0,
      workflowVersion: 1,
      runAttempts: 0,
      maxRunAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const t0 = new Date();
    const [a] = await store.claimRunnable(1, { workerId: "a", leaseMs: 1, now: t0 });
    const t1 = new Date(t0.getTime() + 50);
    const [b] = await store.claimRunnable(1, { workerId: "b", leaseMs: 5_000, now: t1 });
    expect(b?.id).toBe(a?.id);
    expect(b?.leaseToken).not.toBe(a?.leaseToken);
  });

  it("fences stale token writes after reclaim during a long step", async () => {
    const store = createKyselyWorkflowStore(db, { dialect: "postgres" });
    const { gate, open } = createGate();
    let nowMs = Date.now();
    const now = () => new Date(nowMs);

    const wf = defineWorkflow({
      name: "pg.lease.fence",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("block", async () => {
          await gate;
          return "x";
        });
        return { ok: true };
      },
    });

    const engineA = new WorkflowEngine({ store, now, leaseRenewalIntervalMs: 60_000 });
    engineA.register(wf);
    const instance = await engineA.start(wf, {}, { autoExecute: false });
    const [claimedA] = await store.claimRunnable(1, { workerId: "a", leaseMs: 100, now: now() });
    const runA = engineA.execute(instance.id, { leaseToken: claimedA!.leaseToken, leaseMs: 100 });

    nowMs += 200;
    const [claimedB] = await store.claimRunnable(1, { workerId: "b", leaseMs: 5_000, now: now() });
    open();
    const resultA = await runA;
    expect(resultA?.status).not.toBe("completed");

    const engineB = new WorkflowEngine({ store, now });
    engineB.register(wf);
    const resultB = await engineB.execute(instance.id, { leaseToken: claimedB!.leaseToken, leaseMs: 5_000 });
    expect(resultB?.status).toBe("completed");
  });
});
