import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { createKyselyAiBudgetStore } from "./kysely/store.js";
import type { AiBudgetDatabase } from "./kysely/schema.js";
import { migrateAiBudgetSchema } from "./kysely/migrate.js";

function createSqliteDb() {
  const sqlite = new Database(":memory:");
  const db = new Kysely<AiBudgetDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
  return { db, sqlite };
}

describe("kysely ai budget store (sqlite)", () => {
  it("acquires and settles idempotently", async () => {
    const { db, sqlite } = createSqliteDb();
    await migrateAiBudgetSchema(db, "sqlite");
    const store = createKyselyAiBudgetStore(db, { dialect: "sqlite" });
    const requestId = randomUUID();
    await store.acquireReservation({
      requestId,
      key: { userId: "u1", maxTokensPerPeriod: 100 },
      estimatedTokens: 10,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await store.settleReservation({
      requestId,
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
    });
    await store.settleReservation({
      requestId,
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
    });
    const usage = await store.getUsage({ userId: "u1" });
    expect(usage?.tokensUsed).toBe(10);
    await db.destroy();
    sqlite.close();
  });

  it("double settle does not double count", async () => {
    const { db, sqlite } = createSqliteDb();
    await migrateAiBudgetSchema(db, "sqlite");
    const store = createKyselyAiBudgetStore(db, { dialect: "sqlite" });
    const requestId = randomUUID();
    await store.acquireReservation({
      requestId,
      key: { userId: "u2", maxTokensPerPeriod: 50 },
      estimatedTokens: 5,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const usage = { promptTokens: 2, completionTokens: 3, totalTokens: 5 };
    await store.settleReservation({ requestId, usage });
    await store.settleReservation({ requestId, usage });
    expect((await store.getUsage({ userId: "u2" }))?.tokensUsed).toBe(5);
    await db.destroy();
    sqlite.close();
  });
});
