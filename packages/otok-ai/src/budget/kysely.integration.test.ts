import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { createKyselyAiBudgetStore } from "./kysely/store.js";
import { migrateAiBudgetSchema } from "./kysely/migrate.js";
import { RESERVATIONS_TABLE, USAGE_TABLE, type AiBudgetDatabase } from "./kysely/schema.js";
import { usdToMicroUsd } from "./micro-usd.js";

const databaseUrl = process.env.OTOK_AI_BUDGET_PG_TEST_URL;
const requireDatabaseTests = process.env.OTOK_REQUIRE_DATABASE_TESTS === "1";

if (requireDatabaseTests && !databaseUrl) {
  throw new Error(
    "OTOK_REQUIRE_DATABASE_TESTS=1 but OTOK_AI_BUDGET_PG_TEST_URL is missing. Point it at a disposable Postgres database used only for AI budget integration tests.",
  );
}

describe.skipIf(!databaseUrl)("postgres ai budget integration", () => {
  const hookTimeout = 60_000;
  let db: Kysely<AiBudgetDatabase>;
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    db = new Kysely<AiBudgetDatabase>({ dialect: new PostgresDialect({ pool }) });
    await migrateAiBudgetSchema(db, "postgres");
  }, hookTimeout);

  afterEach(async () => {
    await sql`TRUNCATE ${sql.table(RESERVATIONS_TABLE)}, ${sql.table(USAGE_TABLE)} CASCADE`.execute(db);
  });

  afterAll(async () => {
    await db?.destroy().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }, hookTimeout);

  it("enforces org cap across two users in one transaction path", async () => {
    const microLimit = usdToMicroUsd(0.001);
    const store = createKyselyAiBudgetStore(db, { dialect: "postgres", defaults: { maxCostUsdPerOrg: 0.001 } });
    const r1 = randomUUID();
    await store.acquireReservation({
      requestId: r1,
      key: { orgId: "org-a", userId: "u1", maxCostMicroUsdPerOrg: microLimit },
      estimatedTokens: 1,
      estimatedCostMicroUsd: microLimit,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await store.settleReservation({
      requestId: r1,
      usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1, estimatedCostUsd: 0.001 },
    });

    await expect(
      store.acquireReservation({
        requestId: randomUUID(),
        key: { orgId: "org-a", userId: "u2", maxCostMicroUsdPerOrg: microLimit },
        estimatedTokens: 1,
        estimatedCostMicroUsd: 1,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).rejects.toThrow(/budget/i);
  });

  it("serializes concurrent acquire on the same user limit", async () => {
    const store = createKyselyAiBudgetStore(db, { dialect: "postgres" });
    const key = { userId: "race", maxTokensPerPeriod: 15 };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const results = await Promise.allSettled([
      store.acquireReservation({
        requestId: randomUUID(),
        key,
        estimatedTokens: 10,
        expiresAt,
      }),
      store.acquireReservation({
        requestId: randomUUID(),
        key,
        estimatedTokens: 10,
        expiresAt,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it("releases expired reservations without consuming tokens", async () => {
    const past = new Date(Date.now() - 1_000).toISOString();
    const store = createKyselyAiBudgetStore(db, {
      dialect: "postgres",
      now: () => new Date(Date.now() + 2_000),
    });
    const requestId = randomUUID();
    await store.acquireReservation({
      requestId,
      key: { userId: "exp", maxTokensPerPeriod: 100 },
      estimatedTokens: 20,
      expiresAt: past,
    });
    await store.acquireReservation({
      requestId: randomUUID(),
      key: { userId: "exp", maxTokensPerPeriod: 100 },
      estimatedTokens: 20,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const usage = await store.getUsage({ userId: "exp" });
    expect(usage?.tokensUsed ?? 0).toBe(0);
  });

  it("migrates schema on existing database without destructive reset", async () => {
    await migrateAiBudgetSchema(db, "postgres");
    const tables = await sql<{ tablename: string }>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_budget_usage', 'ai_budget_reservations')
    `.execute(db);
    expect(tables.rows.length).toBe(2);
  });
});
