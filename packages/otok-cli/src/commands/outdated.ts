import { findOutdated } from "@otok/registry";
import { loadProjectSnapshot, loadRegistryForProject } from "../registry-context.js";
import { findProjectRoot, fail, ok, warn } from "../utils.js";

function usage(): string {
  return `Usage: otok outdated [options]

List installed Otok extensions that have newer registry versions.

Options:
  --json
  --help, -h
`;
}

export async function runOutdatedCommand(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  try {
    const root = await findProjectRoot(process.cwd());
    const project = await loadProjectSnapshot(root);
    const registry = await loadRegistryForProject(root);
    const installed = { ...project.dependencies, ...project.devDependencies };
    const outdated = findOutdated(installed, registry.extensions);

    if (argv.includes("--json")) {
      process.stdout.write(`${JSON.stringify(outdated, null, 2)}\n`);
      return 0;
    }

    if (outdated.length === 0) {
      ok("All registry-tracked extensions are up to date.");
      return 0;
    }

    process.stdout.write("Package                          Installed   Latest\n");
    for (const row of outdated) {
      process.stdout.write(
        `${row.name.padEnd(32)} ${row.installed.padEnd(11)} ${row.latest}\n`,
      );
    }
    return 0;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export { usage as outdatedUsage };
