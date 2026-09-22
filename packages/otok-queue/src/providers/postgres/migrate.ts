import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Kysely } from "kysely";
import { sql } from "kysely";

const here = dirname(fileURLToPath(import.meta.url));

export async function migratePostgresQueueSchema(
  db: Kysely<unknown> | Kysely<import("./schema.js").QueueDatabase>,
  direction: "up" | "down" = "up",
): Promise<void> {
  const file = join(here, "../../../migrations/postgres/20260101000000_otok_queue." + direction + ".sql");
  const contents = await readFile(file, "utf8");
  for (const statement of contents
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
