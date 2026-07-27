import type { Context } from "hono";
import type { Kysely } from "kysely";
import { getKyselyRuntime, tryGetKyselyRuntime } from "./registry.js";

export function dbFromHono<DB = unknown>(hono: Context, contextKey?: string): Kysely<DB> {
  const runtime = tryGetKyselyRuntime<DB>();
  if (!runtime) {
    throw new Error(
      "otok-kysely: no database runtime registered. Add kysely() to otok.config.ts plugins.",
    );
  }
  const key = contextKey ?? runtime.contextKey;
  const db = hono.get(key) as Kysely<DB> | undefined;
  if (!db) {
    throw new Error(`otok-kysely: db not found on Hono context key "${key}".`);
  }
  return db;
}

export function getDb<DB = unknown>(): Kysely<DB> {
  return getKyselyRuntime<DB>().db;
}
