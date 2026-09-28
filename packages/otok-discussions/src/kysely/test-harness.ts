import Database from "better-sqlite3";
import type { Kysely } from "kysely";
import { Kysely as KyselyCtor, PostgresDialect, SqliteDialect } from "kysely";
import pg from "pg";
import type { DiscussionsDatabase } from "./schema.js";
import { migrateDiscussionsSchema, rollbackDiscussionsSchema } from "./migrate.js";

export async function createSqliteDiscussionsDb(): Promise<{
  db: Kysely<DiscussionsDatabase>;
  destroy: () => Promise<void>;
}> {
  const sqlite = new Database(":memory:");
  const db = new KyselyCtor<DiscussionsDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
  await migrateDiscussionsSchema(db, "sqlite", "up");
  return {
    db,
    destroy: async () => {
      await db.destroy();
    },
  };
}

export async function createPostgresDiscussionsDb(connectionString: string): Promise<{
  db: Kysely<DiscussionsDatabase>;
  pool: pg.Pool;
  destroy: () => Promise<void>;
}> {
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5_000 });
  const db = new KyselyCtor<DiscussionsDatabase>({ dialect: new PostgresDialect({ pool }) });
  await rollbackDiscussionsSchema(db, "postgres");
  await migrateDiscussionsSchema(db, "postgres", "up");
  return {
    db,
    pool,
    destroy: async () => {
      await db.destroy();
      await pool.end();
    },
  };
}

export async function resetDiscussionsTables(db: Kysely<DiscussionsDatabase>): Promise<void> {
  await rollbackDiscussionsSchema(db, "sqlite");
  await migrateDiscussionsSchema(db, "sqlite", "up");
}
