import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { Kysely } from "kysely";
import type { SeedModule } from "../types.js";

export async function loadSeedModules(directory: string): Promise<Array<{ name: string; run: (db: Kysely<unknown>) => Promise<void> }>> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }

  const seeds: Array<{ name: string; run: (db: Kysely<unknown>) => Promise<void> }> = [];

  for (const entry of entries.sort()) {
    const ext = extname(entry);
    if (ext !== ".ts" && ext !== ".js" && ext !== ".mts" && ext !== ".mjs") continue;

    const modulePath = pathToFileURL(join(directory, entry)).href;
    const mod = (await import(modulePath)) as SeedModule;
    const handler = mod.default ?? mod.seed;
    if (typeof handler !== "function") continue;

    seeds.push({
      name: entry.replace(/\.(ts|js|mts|mjs)$/, ""),
      run: async (db) => {
        await handler(db);
      },
    });
  }

  return seeds;
}

export async function runSeeds(db: Kysely<unknown>, directory: string): Promise<string[]> {
  const seeds = await loadSeedModules(directory);
  const ran: string[] = [];

  for (const seed of seeds) {
    await seed.run(db);
    ran.push(seed.name);
  }

  return ran;
}
