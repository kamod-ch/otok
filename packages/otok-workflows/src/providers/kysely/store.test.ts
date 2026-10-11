import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import { defineWorkflow, z } from "../../define-workflow.js";
import { WorkflowEngine } from "../../engine.js";
import { createKyselyWorkflowStore, migrateWorkflowsSchema, type WorkflowsDatabase } from "./store.js";

function createSqliteStore() {
  const sqlite = new Database(":memory:");
  const db = new Kysely<WorkflowsDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
  return { db, sqlite };
}

describe("kysely workflow store", () => {
  it("round-trips nested JSON on sqlite", async () => {
    const { db, sqlite } = createSqliteStore();
    await migrateWorkflowsSchema(db, "sqlite");
    const store = createKyselyWorkflowStore(db, { dialect: "sqlite" });
    await store.createInstance({
      id: "i1",
      workflowName: "w",
      status: "pending",
      input: { nested: { arr: [1, 2], ok: true } },
      progress: 0,
      workflowVersion: 1,
      runAttempts: 0,
      maxRunAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const loaded = await store.getInstance("i1");
    expect(loaded?.input).toEqual({ nested: { arr: [1, 2], ok: true } });
    sqlite.close();
  });

  it("atomically claims and releases leases", async () => {
    const { db, sqlite } = createSqliteStore();
    await migrateWorkflowsSchema(db, "sqlite");
    const store = createKyselyWorkflowStore(db, { dialect: "sqlite" });
    await store.createInstance({
      id: "i2",
      workflowName: "w",
      status: "pending",
      input: {},
      progress: 0,
      workflowVersion: 1,
      runAttempts: 0,
      maxRunAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { availableAt: new Date(0).toISOString() },
    });

    const [claimed] = await store.claimRunnable(1, { workerId: "w1", leaseMs: 10_000 });
    expect(claimed?.leaseToken).toBeTruthy();

    const during = await store.getInstance("i2");
    expect(during?.leaseOwner).toBe("w1");

    await store.releaseClaim("i2", claimed!.leaseToken);
    const after = await store.getInstance("i2");
    expect(after?.leaseToken).toBeUndefined();
    sqlite.close();
  });

  it("reclaims expired lease via processRunnable", async () => {
    const { db, sqlite } = createSqliteStore();
    await migrateWorkflowsSchema(db, "sqlite");
    const store = createKyselyWorkflowStore(db, { dialect: "sqlite" });
    const wf = defineWorkflow({
      name: "sqlite.persist",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("once", () => "x");
        return { ok: true };
      },
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    const instance = await engine.start(wf, {}, { autoExecute: false });
    const [claimed] = await store.claimRunnable(1, { workerId: "slow", leaseMs: 1, now: new Date() });
    expect(claimed.id).toBe(instance.id);
    await new Promise((r) => setTimeout(r, 20));
    const reclaimed = await store.claimRunnable(1, { workerId: "fast", leaseMs: 5_000 });
    expect(reclaimed[0]?.id).toBe(instance.id);
    sqlite.close();
  });

  it("fences updateInstanceIfHeld across two sqlite connections", async () => {
    const dir = mkdtempSync(join(tmpdir(), "otok-wf-"));
    const dbPath = join(dir, "wf.sqlite");
    const sqliteA = new Database(dbPath);
    const sqliteB = new Database(dbPath);
    const dbA = new Kysely<WorkflowsDatabase>({ dialect: new SqliteDialect({ database: sqliteA }) });
    const dbB = new Kysely<WorkflowsDatabase>({ dialect: new SqliteDialect({ database: sqliteB }) });
    await migrateWorkflowsSchema(dbA, "sqlite");
    const storeA = createKyselyWorkflowStore(dbA, { dialect: "sqlite" });
    const storeB = createKyselyWorkflowStore(dbB, { dialect: "sqlite" });

    await storeA.createInstance({
      id: "dual",
      workflowName: "w",
      status: "pending",
      input: {},
      progress: 0,
      workflowVersion: 1,
      runAttempts: 0,
      maxRunAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [a] = await storeA.claimRunnable(1, { workerId: "a", leaseMs: 50, now: new Date() });
    const stale = await storeA.updateInstanceIfHeld("dual", { progress: 99 }, { leaseToken: a!.leaseToken });
    expect(stale).toBe(true);

    const later = new Date(Date.now() + 100);
    const [b] = await storeB.claimRunnable(1, { workerId: "b", leaseMs: 5_000, now: later });
    expect(b?.leaseToken).not.toBe(a!.leaseToken);

    const blocked = await storeA.updateInstanceIfHeld("dual", { progress: 1 }, { leaseToken: a!.leaseToken });
    expect(blocked).toBe(false);

    sqliteA.close();
    sqliteB.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("renewLease extends lease_until while token matches", async () => {
    const { db, sqlite } = createSqliteStore();
    await migrateWorkflowsSchema(db, "sqlite");
    const store = createKyselyWorkflowStore(db, { dialect: "sqlite" });
    await store.createInstance({
      id: "renew",
      workflowName: "w",
      status: "pending",
      input: {},
      progress: 0,
      workflowVersion: 1,
      runAttempts: 0,
      maxRunAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    const [claimed] = await store.claimRunnable(1, { workerId: "w", leaseMs: 1_000, now: t0 });
    const renewed = await store.renewLease("renew", claimed!.leaseToken, {
      leaseMs: 5_000,
      now: new Date(t0.getTime() + 500),
    });
    expect(renewed).toBe(true);
    const row = await store.getInstance("renew");
    expect(new Date(row!.leaseUntil!).getTime()).toBe(t0.getTime() + 5_500);
    sqlite.close();
  });
});
