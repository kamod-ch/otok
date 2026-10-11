import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { AiBudgetDatabase, AiBudgetDialect } from "./schema.js";
import { POSTGRES_MIGRATION, SQLITE_MIGRATION } from "./schema.js";

export async function migrateAiBudgetSchema(db: Kysely<AiBudgetDatabase>, dialect: AiBudgetDialect): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
