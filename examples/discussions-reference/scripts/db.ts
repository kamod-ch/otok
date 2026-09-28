import { runDbMigrate, runDbSeed, runDbStatus } from "@kamod-ch/otok-kysely/cli";
import { createKyselyInstance } from "@kamod-ch/otok-kysely";
import { migrateDiscussionsSchema } from "@kamod-ch/otok-discussions/kysely";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { RefDatabase } from "../src/db/types.js";
import type { DiscussionsDatabase } from "@kamod-ch/otok-discussions/kysely";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const connectionString =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5437/discussions_reference";

const options = {
  dialect: "postgres" as const,
  connectionString,
  migrations: { directory: "migrations" },
  seeds: { directory: "seeds" },
};

const cmd = process.argv[2] ?? "migrate";

async function ensureDiscussionsSchema() {
  const db = await createKyselyInstance<RefDatabase & DiscussionsDatabase>("postgres", connectionString);
  try {
    await migrateDiscussionsSchema(db, "postgres", "up");
    console.log("Discussions schema applied.");
  } finally {
    await db.destroy();
  }
}

if (cmd === "migrate") {
  const applied = await runDbMigrate({ root, options });
  for (const name of applied) console.log(`Applied: ${name}`);
  if (applied.length === 0) console.log("No pending app migrations.");
  await ensureDiscussionsSchema();
} else if (cmd === "seed") {
  await ensureDiscussionsSchema();
  await runDbSeed({ root, options });
  console.log("Seed complete.");
} else if (cmd === "status") {
  const status = await runDbStatus({ root, options });
  for (const entry of status) {
    console.log(`${entry.applied ? "✓" : "○"} ${entry.name}`);
  }
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
