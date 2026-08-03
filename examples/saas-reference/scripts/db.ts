import { runDbMigrate, runDbSeed, runDbStatus } from "@kamod-ch/otok-kysely/cli";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const connectionString =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5434/saas_reference";

const options = {
  dialect: "postgres" as const,
  connectionString,
  migrations: { directory: "migrations" },
  seeds: { directory: "seeds" },
};

const cmd = process.argv[2] ?? "migrate";

if (cmd === "migrate") {
  const applied = await runDbMigrate({ root, options });
  for (const name of applied) console.log(`Applied: ${name}`);
  if (applied.length === 0) console.log("No pending migrations.");
} else if (cmd === "seed") {
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
