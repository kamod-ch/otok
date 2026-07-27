import { join } from "node:path";
import { findOtokConfigFile } from "../project.js";

export interface DbCommandOptions {
  root?: string;
  dryRun?: boolean;
  steps?: number;
}

const DB_HELP = `Usage:
  otok db:migrate [options]
  otok db:rollback [--steps N] [options]
  otok db:seed [options]
  otok db:status [options]

Options:
  --dry-run    Print what would run without executing
  --steps N    Number of migrations to roll back (default: 1)
`;

export async function runDbCommand(subcommand: string | undefined, argv: string[]): Promise<number> {
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    process.stdout.write(`otok db — database commands\n\n${DB_HELP}\n`);
    return 0;
  }

  const options = parseDbArgv(argv);
  const root = options.root ?? process.cwd();
  const configPath = await findOtokConfigFile(root);

  if (!configPath) {
    process.stderr.write("No otok.config.ts found. Run from an Otok project root.\n");
    return 1;
  }

  let kyselyOptions: import("@kamod-ch/otok-kysely").KyselyPluginOptions;
  try {
    kyselyOptions = await loadKyselyOptions(configPath);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const { runDbMigrate, runDbRollback, runDbSeed, runDbStatus } = await import(
    "@kamod-ch/otok-kysely/cli"
  );

  const ctx = { root, options: kyselyOptions };

  try {
    switch (subcommand) {
      case "migrate": {
        if (options.dryRun) {
          process.stdout.write("[dry-run] Would run pending migrations.\n");
          return 0;
        }
        const migrated = await runDbMigrate(ctx);
        if (migrated.length === 0) {
          process.stdout.write("No pending migrations.\n");
        } else {
          for (const name of migrated) {
            process.stdout.write(`Applied: ${name}\n`);
          }
        }
        return 0;
      }
      case "rollback": {
        if (options.dryRun) {
          process.stdout.write(`[dry-run] Would roll back ${options.steps ?? 1} migration(s).\n`);
          return 0;
        }
        const rolled = await runDbRollback(ctx, options.steps ?? 1);
        if (rolled.length === 0) {
          process.stdout.write("No migrations to roll back.\n");
        } else {
          for (const name of rolled) {
            process.stdout.write(`Rolled back: ${name}\n`);
          }
        }
        return 0;
      }
      case "seed": {
        if (options.dryRun) {
          process.stdout.write("[dry-run] Would run seed files.\n");
          return 0;
        }
        const ran = await runDbSeed(ctx);
        if (ran.length === 0) {
          process.stdout.write("No seed files found.\n");
        } else {
          for (const name of ran) {
            process.stdout.write(`Seeded: ${name}\n`);
          }
        }
        return 0;
      }
      case "status": {
        const status = await runDbStatus(ctx);
        if (status.length === 0) {
          process.stdout.write("No migration files found.\n");
        } else {
          for (const entry of status) {
            const marker = entry.applied ? "✓" : "○";
            const date = entry.appliedAt ? ` (${entry.appliedAt.toISOString()})` : "";
            process.stdout.write(`${marker} ${entry.name}${date}\n`);
          }
        }
        return 0;
      }
      default:
        process.stderr.write(`Unknown db subcommand "${subcommand}".\n\n${DB_HELP}\n`);
        return 1;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseDbArgv(argv: string[]): DbCommandOptions {
  const options: DbCommandOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--steps") {
      options.steps = Number(argv[++index] ?? 1);
    } else if (arg === "--root") {
      options.root = argv[++index];
    }
  }
  return options;
}

async function loadKyselyOptions(
  configPath: string,
): Promise<import("@kamod-ch/otok-kysely").KyselyPluginOptions> {
  const mod = await import(configPath);
  const config = mod.default ?? mod;
  const plugins = config?.plugins ?? [];

  for (const plugin of plugins) {
    const resolved = typeof plugin === "function" ? plugin() : plugin;
    if (resolved?.name === "@kamod-ch/otok-kysely") {
      const options = resolved.__options;
      if (!options) {
        throw new Error("otok-kysely plugin found but options are unavailable.");
      }
      return options as import("@kamod-ch/otok-kysely").KyselyPluginOptions;
    }
  }

  throw new Error(
    "No @kamod-ch/otok-kysely plugin in otok.config.ts. Add kysely() to plugins first.",
  );
}

export { DB_HELP };
