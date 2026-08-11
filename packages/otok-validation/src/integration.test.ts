import { describe, expect, it, afterEach } from "vitest";
import { z } from "zod";
import { createTestDatabase } from "@kamod-ch/otok-kysely/test";
import { registerKyselyRuntime, resetKyselyRuntimeForTests } from "@kamod-ch/otok-kysely/registry";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { withTransaction } from "@kamod-ch/otok-kysely";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

describe("kysely + validation integration", () => {
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    resetKyselyRuntimeForTests();
    await cleanup?.();
  });

  it("creates a contact via defineAction with schema and db", async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;

    await testDb.db.schema
      .createTable("contacts")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("email", "text", (col) => col.notNull())
      .execute();

    registerKyselyRuntime({
      db: testDb.db,
      contextKey: "db",
      dialect: "sqlite",
      connectionString: testDb.connectionString,
      migrations: { directory: "migrations", tableName: "otok_migrations" },
      seeds: { directory: "seeds" },
      edgeCapable: true,
    });

    const action = defineAction({
      schema: contactSchema,
      handler: async ({ input, db }) => {
        if (!db) throw new Error("db required");
        return (db as any)
          .insertInto("contacts")
          .values({ name: input.name, email: input.email })
          .returningAll()
          .executeTakeFirstOrThrow();
      },
    });

    const formData = new FormData();
    formData.set("name", "Ada Lovelace");
    formData.set("email", "ada@example.com");

    const result = await action({
      hono: { get: (key: string) => (key === "db" ? testDb.db : undefined) } as never,
      request: new Request("http://localhost/contacts", { method: "POST" }),
      params: {},
      route: "/contacts",
      signal: AbortSignal.timeout(10_000),
      method: "POST",
      formData,
    });

    expect(result).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com" });

    const rows = await (testDb.db as any).selectFrom("contacts").selectAll().execute();
    expect(rows).toHaveLength(1);
  });

  it("supports transactions across multiple inserts", async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;

    await testDb.db.schema
      .createTable("contacts")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("email", "text", (col) => col.notNull())
      .execute();

    await withTransaction(testDb.db, async (trx) => {
      await (trx as any).insertInto("contacts").values({ name: "Ada", email: "a@example.com" }).execute();
      await (trx as any).insertInto("contacts").values({ name: "Grace", email: "g@example.com" }).execute();
    });

    const rows = await (testDb.db as any).selectFrom("contacts").selectAll().execute();
    expect(rows).toHaveLength(2);
  });
});
