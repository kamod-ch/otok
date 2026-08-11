import { formatExtensionDetail, resolveExtension } from "@kamod-ch/otok-registry";
import { loadRegistryForProject } from "../registry-context.js";
import { fail } from "../utils.js";

function usage(): string {
  return `Usage: otok info <extension> [options]

Show registry details for an extension.

Arguments:
  extension           Package name or alias (e.g. otok-kysely, storage)

Options:
  --json              Print JSON
  --help, -h
`;
}

export function parseInfoArgv(argv: string[]) {
  const options: { json?: boolean; help?: boolean } = {};
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") return { help: true, options, name: "" };
    if (arg === "--json") { options.json = true; continue; }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}".`);
    positional.push(arg);
  }
  return { name: positional[0], options };
}

export async function runInfoCommand(argv: string[]): Promise<number> {
  try {
    const parsed = parseInfoArgv(argv);
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (!parsed.name) {
      fail("Missing extension name.");
      process.stdout.write(`\n${usage()}\n`);
      return 1;
    }

    const registry = await loadRegistryForProject(process.cwd());
    const entry = resolveExtension(registry, parsed.name);
    if (!entry) {
      fail(`Extension "${parsed.name}" not found in registry.`);
      return 1;
    }

    if (parsed.options.json) {
      process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatExtensionDetail(entry, registry)}\n`);
    return 0;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export { usage as infoUsage };
