import { runAddCommand } from "./commands/add.js";
import { runAiContextCommand } from "./commands/ai-context.js";
import { runDbCommand } from "./commands/db.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInfoCommand } from "./commands/info.js";
import { runOutdatedCommand } from "./commands/outdated.js";
import { runRoutesCommand, runTypegenCommand } from "./commands/routes.js";
import { runSearchCommand } from "./commands/search.js";

import { runUpgradeCommand } from "./commands/upgrade.js";

const HELP = `otok — CLI for Otok apps

Usage:
  otok add <plugin> [options]
  otok search <query> [options]
  otok info <extension> [options]
  otok upgrade [options]
  otok doctor [options]
  otok outdated [options]
  otok db:<command> [options]
  otok ai-context [options]
  otok typegen [options]
  otok routes [options]

Commands:
  add           Install a plugin and register it in otok.config.ts
  search        Search the extension registry
  info          Show registry details for an extension
  upgrade       Upgrade core, adapters, and registry extensions
  doctor        Diagnose project health (versions, plugins, security)
  outdated      List extensions with newer registry versions
  db:migrate    Run pending database migrations
  db:rollback   Roll back the last migration(s)
  db:seed       Run seed files
  db:status     Show migration status
  ai-context    Generate AI agent context (Cursor, Codex, AGENTS.md)
  typegen       Generate typed route module declarations
  routes        Print the route tree

Run "otok <command> --help" for command options.
`;

export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  if (command === "add") {
    return runAddCommand(rest);
  }

  if (command === "search") {
    return runSearchCommand(rest);
  }

  if (command === "info") {
    return runInfoCommand(rest);
  }

  if (command === "doctor") {
    return runDoctorCommand(rest);
  }

  if (command === "outdated") {
    return runOutdatedCommand(rest);
  }

  if (command === "upgrade") {
    return runUpgradeCommand(rest);
  }

  if (command === "ai-context" || command === "ai:context") {
    return runAiContextCommand(rest);
  }

  if (command === "db" || command.startsWith("db:")) {
    const subcommand = command === "db" ? rest.shift() : command.slice("db:".length);
    return runDbCommand(subcommand, rest);
  }

  if (command === "typegen") {
    return runTypegenCommand(rest);
  }

  if (command === "routes") {
    return runRoutesCommand(rest);
  }

  process.stderr.write(`Unknown command "${command}".\n\n${HELP}\n`);
  return 1;
}
