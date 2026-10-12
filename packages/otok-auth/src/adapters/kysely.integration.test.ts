import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { Hono } from "hono";
import { sha256 } from "../crypto.js";
import { createSessionManager } from "../session/manager.js";
import { createKyselySessionAdapter } from "./kysely.js";

const databaseUrl = process.env.OTOK_AUTH_PG_TEST_URL;
const requireDatabaseTests = process.env.OTOK_REQUIRE_DATABASE_TESTS === "1";

if (requireDatabaseTests && !databaseUrl) {
  throw new Error(
    "OTOK_REQUIRE_DATABASE_TESTS=1 but OTOK_AUTH_PG_TEST_URL is missing. Point it at a disposable Postgres database used only for auth session integration tests.",
  );
}

type User = { id: string };

type TestDb = Record<string, Record<string, unknown>>;

function tableNameForSuffix(suffix: string): string {
  return `sessionRot${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
}

async function createIsolatedTable(db: Kysely<TestDb>, suffix: string): Promise<string> {
  const table = tableNameForSuffix(suffix);
  const physical = `session_rot_${suffix.charAt(0).toLowerCase()}${suffix.slice(1)}`;
  await sql.raw(`DROP TABLE IF EXISTS ${physical}`).execute(db);
  await sql
    .raw(`
    CREATE TABLE ${physical} (
      user_id TEXT NOT NULL,
      token_hash TEXT PRIMARY KEY,
      user_agent TEXT,
      ip_address TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ
    )
  `)
    .execute(db);
  return table;
}

async function dropIsolatedTable(db: Kysely<TestDb>, suffix: string): Promise<void> {
  const physical = `session_rot_${suffix.charAt(0).toLowerCase()}${suffix.slice(1)}`;
  await sql.raw(`DROP TABLE IF EXISTS ${physical}`).execute(db);
}

describe.skipIf(!databaseUrl)("kysely session adapter postgres integration", () => {
  const hookTimeout = 60_000;
  const suffix = `t${randomUUID().replace(/-/g, "").slice(0, 11)}`;
  let pool1: pg.Pool;
  let pool2: pg.Pool;
  let db1: Kysely<TestDb>;
  let db2: Kysely<TestDb>;
  let table: string;
  const users = new Map<string, User>([["u1", { id: "u1" }]]);

  beforeAll(async () => {
    pool1 = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    pool2 = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    const plugin = new CamelCasePlugin();
    db1 = new Kysely<TestDb>({ dialect: new PostgresDialect({ pool: pool1 }), plugins: [plugin] });
    db2 = new Kysely<TestDb>({ dialect: new PostgresDialect({ pool: pool2 }), plugins: [plugin] });
    table = await createIsolatedTable(db1, suffix);
  }, hookTimeout);

  afterAll(async () => {
    await dropIsolatedTable(db1, suffix).catch(() => undefined);
    await db1?.destroy().catch(() => undefined);
    await db2?.destroy().catch(() => undefined);
    await pool1?.end().catch(() => undefined);
    await pool2?.end().catch(() => undefined);
  }, hookTimeout);

  function makeAdapter(db: Kysely<TestDb>) {
    return createKyselySessionAdapter<User>({
      db,
      table,
      resolveUser: (_tokenHash) => (users.has("u1") ? { id: "u1" } : null),
    });
  }

  it("rotates exclusively across two pools and manager cookies", async () => {
    const adapter1 = makeAdapter(db1);
    const adapter2 = makeAdapter(db2);
    const sessions1 = createSessionManager({ sessionCookie: "sid", csrfCookie: "csrf", secure: false }, adapter1);
    const sessions2 = createSessionManager({ sessionCookie: "sid", csrfCookie: "csrf", secure: false }, adapter2);

    const loginApp = new Hono();
    loginApp.get("/login", async (c) => {
      await sessions1.createSession(c, "u1");
      return c.text("ok");
    });

    const rotateApp1 = new Hono();
    rotateApp1.post("/rotate", async (c) => {
      await sessions1.rotateSession(c);
      return c.body(null, 204);
    });

    const rotateApp2 = new Hono();
    rotateApp2.post("/rotate", async (c) => {
      await sessions2.rotateSession(c);
      return c.body(null, 204);
    });

    const login = await loginApp.request("/login");
    const token = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const cookie = `sid=${token}`;

    const [r1, r2] = await Promise.all([
      rotateApp1.request("/rotate", { method: "POST", headers: { cookie } }),
      rotateApp2.request("/rotate", { method: "POST", headers: { cookie } }),
    ]);

    const set1 = r1.headers.getSetCookie();
    const set2 = r2.headers.getSetCookie();
    const winners = [set1, set2].filter((list) => list.some((v) => v.startsWith("sid=") && !v.includes("Max-Age=0")));
    expect(winners).toHaveLength(1);

    const winnerSetCookie = winners[0]!.find((v) => v.startsWith("sid="))!;
    const newToken = winnerSetCookie.split("=")[1]!.split(";")[0]!;
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(token);

    expect(await adapter1.resolveUser(sha256(token))).toBeNull();
    expect(await adapter2.resolveUser(sha256(newToken))).toEqual({ id: "u1" });
  });

  it("reconnect with fresh pool resolves the rotated token", async () => {
    const adapter = makeAdapter(db1);
    const expiresAt = new Date(Date.now() + 60_000);
    await adapter.createRecord({
      tokenHash: "hash-old",
      userId: "u1",
      expiresAt,
      userAgent: null,
      ipAddress: null,
    });

    const won = await adapter.rotateRecord!("hash-old", {
      newTokenHash: "hash-new",
      userId: "u1",
      expiresAt,
      userAgent: null,
      ipAddress: null,
    });
    expect(won).toBe(true);

    const freshPool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
    const freshDb = new Kysely<TestDb>({
      dialect: new PostgresDialect({ pool: freshPool }),
      plugins: [new CamelCasePlugin()],
    });
    const freshAdapter = makeAdapter(freshDb);
    await expect(freshAdapter.resolveUser("hash-new")).resolves.toEqual({ id: "u1" });
    await expect(freshAdapter.resolveUser("hash-old")).resolves.toBeNull();
    await freshDb.destroy();
  });
});
