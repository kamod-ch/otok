import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Kysely } from "kysely";
import { createKyselyInstance, destroyKyselyInstance } from "../pool.js";
import { migrateUp } from "../migrations/runner.js";
import type { BuiltInDialect, DialectAdapter } from "../types.js";

export interface TestDatabaseOptions {
  dialect?: BuiltInDialect | DialectAdapter;
  migrationsDirectory?: string;
  migrationsTableName?: string;
}

export interface TestDatabase<DB = unknown> {
  db: Kysely<DB>;
  connectionString: string;
  cleanup: () => Promise<void>;
}

/**
 * Create an isolated test database with optional migrations applied.
 * Uses a temporary SQLite file by default.
 */
export async function createTestDatabase<DB = unknown>(
  options: TestDatabaseOptions = {},
): Promise<TestDatabase<DB>> {
  const dialect = options.dialect ?? "sqlite";
  const dir = await mkdtemp(join(tmpdir(), "otok-kysely-test-"));
  const connectionString = `sqlite://${join(dir, "test.db")}`;
  const db = await createKyselyInstance<DB>(dialect, connectionString);

  if (options.migrationsDirectory) {
    await migrateUp(
      db as Kysely<unknown>,
      options.migrationsDirectory,
      options.migrationsTableName ?? "otok_migrations",
    );
  }

  return {
    db,
    connectionString,
    cleanup: async () => {
      await destroyKyselyInstance(db);
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export { createTestDatabase as default };
