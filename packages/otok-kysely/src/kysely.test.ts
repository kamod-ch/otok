import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { createTestDatabase } from "./test/index.js";
import { getMigrationStatus, migrateDown, migrateUp } from "./migrations/runner.js";
import { withTransaction } from "./transaction.js";
import { resetKyselyRuntimeForTests, registerKyselyRuntime } from "./registry.js";
import { defineLoader } from "./loader.js";

describe("migrations", () => {
  let migrationsDir: string;
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    migrationsDir = await mkdtemp(join(tmpdir(), "otok-kysely-migrations-"));
    await writeFile(
      join(migrationsDir, "20260101000001_create_contacts.up.sql"),
      `CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL);`,
    );
    await writeFile(
      join(migrationsDir, "20260101000001_create_contacts.down.sql"),
      `DROP TABLE contacts;`,
    );

    testDb = await createTestDatabase({
      migrationsDirectory: undefined,
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
    await rm(migrationsDir, { recursive: true, force: true });
  });

  it("runs pending migrations", async () => {
    const migrated = await migrateUp(testDb.db, migrationsDir, "otok_migrations");
    expect(migrated).toEqual(["20260101000001_create_contacts"]);

    const status = await getMigrationStatus(testDb.db, migrationsDir, "otok_migrations");
    expect(status[0]?.applied).toBe(true);
  });

  it("rolls back migrations", async () => {
    await migrateUp(testDb.db, migrationsDir, "otok_migrations");
    const rolled = await migrateDown(testDb.db, migrationsDir, "otok_migrations", 1);
    expect(rolled).toEqual(["20260101000001_create_contacts"]);
  });
});

describe("withTransaction", () => {
  it("commits successful transactions", async () => {
    const testDb = await createTestDatabase();
    await testDb.db.schema
      .createTable("items")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .execute();

    await withTransaction(testDb.db, async (trx) => {
      await trx.insertInto("items").values({ name: "alpha" }).execute();
    });

    const rows = await testDb.db.selectFrom("items").selectAll().execute();
    expect(rows).toHaveLength(1);
    await testDb.cleanup();
  });
});

describe("defineLoader integration", () => {
  beforeEach(() => resetKyselyRuntimeForTests());
  afterEach(() => resetKyselyRuntimeForTests());

  it("injects db into loaders", async () => {
    const testDb = await createTestDatabase();
    await testDb.db.schema
      .createTable("contacts")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .execute();
    await testDb.db.insertInto("contacts").values({ name: "Ada" }).execute();

    registerKyselyRuntime({
      db: testDb.db,
      contextKey: "db",
      dialect: "sqlite",
      connectionString: testDb.connectionString,
      migrations: { directory: "migrations", tableName: "otok_migrations" },
      seeds: { directory: "seeds" },
      edgeCapable: true,
    });

    const loader = defineLoader(async ({ db }) => {
      return db.selectFrom("contacts").selectAll().execute();
    });

    const result = await loader({
      hono: { get: () => testDb.db } as never,
      request: new Request("http://localhost/"),
      params: {},
      route: "/",
    });

    expect(result).toEqual([{ id: 1, name: "Ada" }]);
    await testDb.cleanup();
  });
});
