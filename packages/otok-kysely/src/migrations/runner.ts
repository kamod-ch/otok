import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { MigrationFile, MigrationRecord, MigrationStatus } from "../types.js";

const MIGRATION_FILE_PATTERN = /^(\d{14})_(.+)\.(up|down)\.sql$/;

export async function loadMigrationFiles(directory: string): Promise<MigrationFile[]> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }

  const groups = new Map<string, { up?: string; down?: string }>();

  for (const entry of entries) {
    const match = MIGRATION_FILE_PATTERN.exec(entry);
    if (!match) continue;
    const [, timestamp, slug, direction] = match;
    const name = `${timestamp}_${slug}`;
    const content = await readFile(join(directory, entry), "utf8");
    const group = groups.get(name) ?? {};
    if (direction === "up") group.up = content;
    if (direction === "down") group.down = content;
    groups.set(name, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.up && group.down)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, group]) => ({
      name,
      up: group.up!,
      down: group.down!,
    }));
}

export async function ensureMigrationsTable(db: Kysely<unknown>, tableName: string): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql.ref(tableName)} (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `.execute(db);
}

export async function getAppliedMigrations(
  db: Kysely<unknown>,
  tableName: string,
): Promise<MigrationRecord[]> {
  await ensureMigrationsTable(db, tableName);
  const rows = await db
    .selectFrom(tableName as never)
    .select(["name", "applied_at"] as never)
    .orderBy("name" as never)
    .execute();

  return rows.map((row) => {
    const record = row as { name: string; applied_at: string };
    return { name: record.name, appliedAt: new Date(record.applied_at) };
  });
}

export async function getMigrationStatus(
  db: Kysely<unknown>,
  directory: string,
  tableName: string,
): Promise<MigrationStatus[]> {
  const files = await loadMigrationFiles(directory);
  const applied = await getAppliedMigrations(db, tableName);
  const appliedMap = new Map(applied.map((record) => [record.name, record]));

  return files.map((file) => {
    const record = appliedMap.get(file.name);
    return {
      name: file.name,
      applied: Boolean(record),
      appliedAt: record?.appliedAt,
    };
  });
}

export async function migrateUp(
  db: Kysely<unknown>,
  directory: string,
  tableName: string,
): Promise<string[]> {
  const files = await loadMigrationFiles(directory);
  const applied = await getAppliedMigrations(db, tableName);
  const appliedNames = new Set(applied.map((record) => record.name));
  const migrated: string[] = [];

  for (const file of files) {
    if (appliedNames.has(file.name)) continue;
    await sql.raw(file.up).execute(db);
    await db
      .insertInto(tableName as never)
      .values({ name: file.name, applied_at: new Date().toISOString() } as never)
      .execute();
    migrated.push(file.name);
  }

  return migrated;
}

export async function migrateDown(
  db: Kysely<unknown>,
  directory: string,
  tableName: string,
  steps = 1,
): Promise<string[]> {
  const files = await loadMigrationFiles(directory);
  const applied = await getAppliedMigrations(db, tableName);
  const rolledBack: string[] = [];

  const toRollback = applied
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, steps);

  for (const record of toRollback) {
    const file = files.find((entry) => entry.name === record.name);
    if (!file) {
      throw new Error(`otok-kysely: migration "${record.name}" has no down file.`);
    }
    await sql.raw(file.down).execute(db);
    await db.deleteFrom(tableName as never).where("name" as never, "=", record.name as never).execute();
    rolledBack.push(record.name);
  }

  return rolledBack;
}

export type { MigrationFile, MigrationRecord, MigrationStatus };
