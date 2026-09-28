import { createKyselyInstance, resolveConnectionString } from "@kamod-ch/otok-kysely";
import type { Kysely } from "kysely";
import type { DiscussionsDatabase } from "@kamod-ch/otok-discussions/kysely";
import type { RefDatabase } from "./types.js";

export type RefDb = Kysely<RefDatabase & DiscussionsDatabase>;

const DEFAULT_URL = "postgres://otok:otok@localhost:5437/discussions_reference";

let shared: RefDb | null = null;
let opening: Promise<RefDb> | null = null;

export function refConnectionString(): string {
  return resolveConnectionString(process.env.DATABASE_URL ?? DEFAULT_URL);
}

export function getRefDb(): RefDb {
  if (shared) return shared;
  if (!opening) {
    opening = createKyselyInstance<RefDatabase & DiscussionsDatabase>("postgres", refConnectionString()).then((db) => {
      shared = db as RefDb;
      return shared;
    });
  }
  throw new Error("Database still connecting — call await ensureRefDb() before getRefDb() in async contexts");
}

export async function ensureRefDb(): Promise<RefDb> {
  if (shared) return shared;
  if (!opening) {
    opening = createKyselyInstance<RefDatabase & DiscussionsDatabase>("postgres", refConnectionString()).then((db) => {
      shared = db as RefDb;
      return shared;
    });
  }
  return opening;
}

export async function destroyRefDb(): Promise<void> {
  if (shared) {
    await shared.destroy();
    shared = null;
    opening = null;
  }
}
