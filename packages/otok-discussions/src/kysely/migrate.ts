import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { DiscussionsDatabase } from "./schema.js";
import { getDiscussionsMigration, type DiscussionsDialect } from "./migrations.js";

export async function migrateDiscussionsSchema(
  db: Kysely<DiscussionsDatabase>,
  dialect: DiscussionsDialect = "sqlite",
  direction: "up" | "down" = "up",
): Promise<void> {
  const migration = getDiscussionsMigration(dialect, direction);
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sql.raw(`${statement};`).execute(db);
  }
}

export async function rollbackDiscussionsSchema(
  db: Kysely<DiscussionsDatabase>,
  dialect: DiscussionsDialect = "sqlite",
): Promise<void> {
  await migrateDiscussionsSchema(db, dialect, "down");
}
