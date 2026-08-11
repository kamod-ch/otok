import {
  resolveExtension,
  searchExtensions,
} from "@kamod-ch/otok-registry";
import { loadRegistryForProject } from "../registry-context.js";
import { fail } from "../utils.js";

function usage(): string {
  return `Usage: otok search <query> [options]

Search the Otok extension registry.

Options:
  --official          Official extensions only
  --community         Community extensions only
  --json              Print JSON results
  --help, -h
`;
}

export function parseSearchArgv(argv: string[]) {
  const options: { official?: boolean; community?: boolean; json?: boolean; help?: boolean } = {};
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") return { help: true, options, query: "" };
    if (arg === "--official") { options.official = true; continue; }
    if (arg === "--community") { options.community = true; continue; }
    if (arg === "--json") { options.json = true; continue; }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}".`);
    positional.push(arg);
  }
  return { query: positional.join(" "), options };
}

export async function runSearchCommand(argv: string[]): Promise<number> {
  try {
    const parsed = parseSearchArgv(argv);
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (!parsed.query) {
      fail("Missing search query.");
      process.stdout.write(`\n${usage()}\n`);
      return 1;
    }

    const registry = await loadRegistryForProject(process.cwd());
    const tier = parsed.options.official ? "official" as const : parsed.options.community ? "community" as const : undefined;
    const results = searchExtensions(registry, { q: parsed.query, tier });

    if (parsed.options.json) {
      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
      return 0;
    }

    if (results.length === 0) {
      process.stdout.write(`No extensions found for "${parsed.query}".\n`);
      return 0;
    }

    for (const ext of results) {
      const publisher = registry.publishersById.get(ext.publisher);
      const verified = publisher?.verified ? " ✓" : "";
      process.stdout.write(`${ext.name}@${ext.version}${verified}\n  ${ext.description}\n\n`);
    }
    process.stdout.write(`${results.length} result(s)\n`);
    return 0;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export { usage as searchUsage };
