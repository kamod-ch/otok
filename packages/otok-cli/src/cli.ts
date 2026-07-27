import { runAddCommand } from "./commands/add.js";
import { runDbCommand } from "./commands/db.js";

const HELP = `otok — CLI for Otok apps

Usage:
  otok add <plugin> [options]
  otok db:<command> [options]

Commands:
  add           Install a plugin and register it in otok.config.ts
  db:migrate    Run pending database migrations
  db:rollback   Roll back the last migration(s)
  db:seed       Run seed files
  db:status     Show migration status

Run "otok add --help" or "otok db --help" for command options.
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

  if (command === "db" || command.startsWith("db:")) {
    const subcommand = command === "db" ? rest.shift() : command.slice("db:".length);
    return runDbCommand(subcommand, rest);
  }

  process.stderr.write(`Unknown command "${command}".\n\n${HELP}\n`);
  return 1;
}
