import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { KyselyCrmRepository } from "./repository.js";
import type { CrmDatabase } from "./types.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE crm_companies (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      uid TEXT,
      legal_form TEXT,
      canton TEXT,
      city TEXT,
      street TEXT,
      postal_code TEXT,
      municipality_code TEXT,
      industry TEXT,
      website TEXT,
      pipeline_id TEXT,
      stage_id TEXT,
      owner_id TEXT,
      tag_ids TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      external_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE crm_audit_log (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      user_id TEXT,
      payload TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE crm_contacts (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      company_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      title TEXT,
      language TEXT NOT NULL
    );
    CREATE TABLE crm_activities (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      contact_id TEXT,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      occurred_at TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE crm_tasks (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_at TEXT,
      assignee_id TEXT,
      status TEXT NOT NULL,
      related_type TEXT,
      related_id TEXT
    );
  `);

  const db = new Kysely<CrmDatabase>({
    dialect: new SqliteDialect({ database: sqlite }),
  });

  return { db, close: () => sqlite.close() };
}

describe("KyselyCrmRepository", () => {
  let db: Kysely<CrmDatabase>;
  let close: () => void;

  beforeEach(() => {
    const test = createTestDb();
    db = test.db;
    close = test.close;
  });

  afterEach(() => {
    close();
  });

  it("imports zefix records and tracks created companies", async () => {
    const indexed: string[] = [];
    const imported: string[] = [];
    const repo = new KyselyCrmRepository(db, {
      onCompanyIndexed: (_orgId, company) => indexed.push(company.id),
      onCompanyImported: (company) => {
        imported.push(company.id);
      },
    });

    const json = JSON.stringify([
      { name: "Test AG", uid: "CHE-123.456.789", canton: "ZH", city: "Zürich" },
    ]);
    const result = await repo.importZefix("org-1", json, "user-1");

    expect(result.imported).toBe(1);
    expect(result.created).toHaveLength(1);
    expect(result.created[0]?.name).toBe("Test AG");
    expect(indexed).toHaveLength(1);
    expect(imported).toHaveLength(1);

    const companies = await repo.listCompanies("org-1", { q: "Test" });
    expect(companies).toHaveLength(1);
  });

  it("skips duplicate uid on second import", async () => {
    const repo = new KyselyCrmRepository(db);
    const json = JSON.stringify([{ name: "Dup AG", uid: "CHE-111.222.333" }]);
    await repo.importZefix("org-1", json);
    const second = await repo.importZefix("org-1", json);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.created).toHaveLength(0);
  });
});
