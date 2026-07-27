import { runAddCommand } from "./commands/add.js";

const HELP = `otok — CLI for Otok apps

Usage:
  otok add <plugin> [options]

Commands:
  add     Install a plugin and register it in otok.config.ts

Run "otok add --help" for add command options.
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

  process.stderr.write(`Unknown command "${command}".\n\n${HELP}\n`);
  return 1;
}
