import { join } from "node:path";
import { getKyselyRuntime } from "../registry.js";
import { getMigrationStatus, migrateDown, migrateUp } from "../migrations/runner.js";
import { runSeeds } from "../seeds/runner.js";
import { createKyselyInstance, destroyKyselyInstance, resolveConnectionString } from "../pool.js";
import type { KyselyPluginOptions } from "../types.js";

export interface DbCliContext {
  root: string;
  options: KyselyPluginOptions;
}

export async function runDbMigrate(ctx: DbCliContext): Promise<string[]> {
  const connectionString = resolveConnectionString(ctx.options.connectionString);
  const db = await createKyselyInstance(ctx.options.dialect, connectionString, ctx.options.pool);
  const migrationsDir = join(ctx.root, ctx.options.migrations?.directory ?? "migrations");
  const tableName = ctx.options.migrations?.tableName ?? "otok_migrations";

  try {
    return await migrateUp(db, migrationsDir, tableName);
  } finally {
    await destroyKyselyInstance(db);
  }
}

export async function runDbRollback(ctx: DbCliContext, steps = 1): Promise<string[]> {
  const connectionString = resolveConnectionString(ctx.options.connectionString);
  const db = await createKyselyInstance(ctx.options.dialect, connectionString, ctx.options.pool);
  const migrationsDir = join(ctx.root, ctx.options.migrations?.directory ?? "migrations");
  const tableName = ctx.options.migrations?.tableName ?? "otok_migrations";

  try {
    return await migrateDown(db, migrationsDir, tableName, steps);
  } finally {
    await destroyKyselyInstance(db);
  }
}

export async function runDbSeed(ctx: DbCliContext): Promise<string[]> {
  const connectionString = resolveConnectionString(ctx.options.connectionString);
  const db = await createKyselyInstance(ctx.options.dialect, connectionString, ctx.options.pool);
  const seedsDir = join(ctx.root, ctx.options.seeds?.directory ?? "seeds");

  try {
    return await runSeeds(db, seedsDir);
  } finally {
    await destroyKyselyInstance(db);
  }
}

export async function runDbStatus(ctx: DbCliContext) {
  const connectionString = resolveConnectionString(ctx.options.connectionString);
  const db = await createKyselyInstance(ctx.options.dialect, connectionString, ctx.options.pool);
  const migrationsDir = join(ctx.root, ctx.options.migrations?.directory ?? "migrations");
  const tableName = ctx.options.migrations?.tableName ?? "otok_migrations";

  try {
    return await getMigrationStatus(db, migrationsDir, tableName);
  } finally {
    await destroyKyselyInstance(db);
  }
}

/** Resolve kysely plugin options from a registered runtime (for in-process CLI). */
export function resolveDbCliFromRuntime(root: string): DbCliContext {
  const runtime = getKyselyRuntime();
  return {
    root,
    options: {
      dialect: runtime.dialect,
      connectionString: runtime.connectionString,
      migrations: runtime.migrations,
      seeds: runtime.seeds,
    },
  };
}
