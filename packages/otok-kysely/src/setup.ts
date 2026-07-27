import { defineSetup, type PluginSetupContext } from "otok";
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { constants } from "node:fs";

const INITIAL_MIGRATION_UP = `-- otok-kysely initial migration
CREATE TABLE IF NOT EXISTS otok_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

const INITIAL_MIGRATION_DOWN = `DROP TABLE IF EXISTS otok_migrations;
`;

export default defineSetup(async ({ root, dryRun }: PluginSetupContext) => {
  const migrationsDir = join(root, "migrations");
  const seedsDir = join(root, "seeds");
  const changes = [];

  if (!dryRun) {
    await mkdir(migrationsDir, { recursive: true });
    await mkdir(seedsDir, { recursive: true });
  }

  const initialUp = join(migrationsDir, "20260101000000_initial.up.sql");
  const initialDown = join(migrationsDir, "20260101000000_initial.down.sql");

  let needsInitial = true;
  if (!dryRun) {
    try {
      await access(initialUp, constants.F_OK);
      needsInitial = false;
    } catch {
      // create initial migration
    }
  }

  if (needsInitial) {
    changes.push({
      kind: "create-file" as const,
      path: "migrations/20260101000000_initial.up.sql",
      content: INITIAL_MIGRATION_UP,
    });
    changes.push({
      kind: "create-file" as const,
      path: "migrations/20260101000000_initial.down.sql",
      content: INITIAL_MIGRATION_DOWN,
    });
  }

  changes.push({
    kind: "mkdir" as const,
    path: "seeds",
  });

  changes.push({
    kind: "append-file" as const,
    path: ".env.example",
    content: "\n# Database connection (server-only — never expose to client)\nDATABASE_URL=sqlite://./data/app.db\n",
  });

  return { changes };
});
