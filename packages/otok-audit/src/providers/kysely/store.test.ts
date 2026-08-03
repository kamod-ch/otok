import { describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { AuditService } from "../../audit.js";
import type { AuditDatabase } from "./store.js";
import { createKyselyAuditStore, migrateAuditSchema } from "./store.js";

const kyselyTests = process.env.KYSELY_SQLITE_TESTS === "1" ? describe : describe.skip;

kyselyTests("Kysely audit store", () => {
  async function createDb() {
    const sqlite = new Database(":memory:");
    const db = new Kysely<AuditDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
    await migrateAuditSchema(db);
    return db;
  }

  it("persists and searches audit entries", async () => {
    const db = await createDb();
    const store = createKyselyAuditStore(db);
    const service = new AuditService({ store });

    await service.record({
      tenantId: "org-1",
      actor: { id: "u-1", type: "user" },
      action: "company.created",
      resource: { type: "company", id: "acme" },
    });

    const result = await service.search({ tenantId: "org-1", actorId: "u-1" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.resource.id).toBe("acme");

    await db.destroy();
  });

  it("is append-only — no update API on store", async () => {
    const store = createKyselyAuditStore(await createDb());
    expect(store).not.toHaveProperty("update");
    expect(store).not.toHaveProperty("delete");
  });
});
