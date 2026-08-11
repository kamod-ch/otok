import path from "node:path";
import {
  formatRouteIssues,
  formatRouteTree,
  runRouteTypegen,
  scanRoutes,
} from "@kamod-ch/otok-route-typegen";
import { loadOtokAppConfig } from "../load-config.js";

const HELP = `Usage: otok typegen [options]

Generate typed route module declarations for the current Otok app.

Options:
  --routes-dir <path>   Routes directory (default: src/app/routes)
  --out-dir <path>      Output directory (default: .otok/types)
  --strict              Fail on route conflicts and invalid routes
  -h, --help            Show help
`;

export async function runTypegenCommand(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const root = process.cwd();
  const config = await loadOtokAppConfig(root);
  const routesDir = readFlag(args, "--routes-dir") ?? config.routesDir ?? "src/app/routes";
  const outputDir = readFlag(args, "--out-dir") ?? ".otok/types";
  const strict = args.includes("--strict") || process.env.CI === "true";

  try {
    const result = runRouteTypegen({ root, routesDir, outputDir, strict });

    if (result.issues.length > 0) {
      process.stderr.write(`${formatRouteIssues(result.issues)}\n\n`);
    }

    process.stdout.write(
      `[otok] Generated ${result.files.length} type file(s) in ${path.relative(root, result.outputDir)} (hash: ${result.manifestHash})\n`,
    );

    return result.ok || !strict ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

export async function runRoutesCommand(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`Usage: otok routes [--routes-dir <path>] [--json]\n`);
    return 0;
  }

  const root = process.cwd();
  const config = await loadOtokAppConfig(root);
  const routesDir = readFlag(args, "--routes-dir") ?? config.routesDir ?? "src/app/routes";
  const scan = scanRoutes({ root, routesDir });

  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(scan, null, 2)}\n`);
    return 0;
  }

  process.stdout.write(`${formatRouteTree(scan)}\n`);
  return 0;
}
