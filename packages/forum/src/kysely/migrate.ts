import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { ForumDatabase } from "./schema.js";
import { getForumMigration, type ForumDialect } from "./migrations.js";

export async function migrateForumSchema(db: Kysely<ForumDatabase>, dialect: ForumDialect = "sqlite"): Promise<void> {
  const migration = getForumMigration(dialect, "up");
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sql.raw(`${statement};`).execute(db);
  }
}

export async function rollbackForumSchema(db: Kysely<ForumDatabase>, dialect: ForumDialect = "sqlite"): Promise<void> {
  const migration = getForumMigration(dialect, "down");
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sql.raw(`${statement};`).execute(db);
  }
}
