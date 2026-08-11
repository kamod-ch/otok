import { findOutdated, resolveExtension } from "@kamod-ch/otok-registry";
import { loadProjectSnapshot, loadRegistryForProject } from "../registry-context.js";
import { detectPackageManager, installCommand } from "../detect-manager.js";
import { findProjectRoot, confirm, fail, ok, runCommand, warn } from "../utils.js";
import { recordTelemetry } from "../telemetry.js";

export interface UpgradePlan {
  package: string;
  from: string;
  to: string;
  reason: string;
}

function usage(): string {
  return `Usage: otok upgrade [options]

Upgrade Otok core, adapters, and registry-tracked extensions.

Options:
  --dry-run           Show planned upgrades without installing
  --skip-install      Print commands only
  --core-only         Upgrade otok, vite-plugin, and adapters only
  --json              Print JSON plan
  --help, -h
`;
}

export function parseUpgradeArgv(argv: string[]) {
  const options: {
    dryRun?: boolean;
    skipInstall?: boolean;
    coreOnly?: boolean;
    json?: boolean;
    help?: boolean;
  } = {};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") return { help: true, options, plans: [] as UpgradePlan[] };
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    if (arg === "--skip-install") { options.skipInstall = true; continue; }
    if (arg === "--core-only") { options.coreOnly = true; continue; }
    if (arg === "--json") { options.json = true; continue; }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}".`);
  }
  return { options, plans: null as UpgradePlan[] | null };
}

export async function buildUpgradePlan(root: string, coreOnly = false): Promise<UpgradePlan[]> {
  const project = await loadProjectSnapshot(root);
  const registry = await loadRegistryForProject(root);
  const installed = { ...project.dependencies, ...project.devDependencies };
  const plans: UpgradePlan[] = [];

  const corePackages = ["otok", "@kamod-ch/otok-vite-plugin", "otok-cli"];
  const adapterPackages = ["otok-adapter-node", "otok-adapter-cloudflare", "otok-adapter-static"];

  for (const pkg of corePackages) {
    const current = installed[pkg]?.replace(/^[\^~>=<]*/, "");
    if (!current) continue;
    // Target 1.0 when released; until then suggest latest from registry narrative
    const target = pkg === "otok" ? "1.0.0" : current.startsWith("0.") ? "1.0.0" : current;
    if (current !== target && semverLt(current, target)) {
      plans.push({ package: pkg, from: current, to: target, reason: "Otok 1.0 core alignment" });
    }
  }

  if (!coreOnly) {
    for (const adapter of adapterPackages) {
      const current = installed[adapter]?.replace(/^[\^~>=<]*/, "");
      if (current && semverLt(current, "1.0.0")) {
        plans.push({ package: adapter, from: current, to: "1.0.0", reason: "Adapter 1.0" });
      }
    }

    const outdated = findOutdated(installed, registry.extensions);
    for (const row of outdated) {
      const entry = resolveExtension(registry, row.name);
      plans.push({
        package: row.name,
        from: row.installed,
        to: row.latest,
        reason: entry?.deprecated ? "Deprecated — upgrade recommended" : "Registry latest",
      });
    }
  }

  return dedupePlans(plans);
}

function semverLt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return false;
  }
  return false;
}

function dedupePlans(plans: UpgradePlan[]): UpgradePlan[] {
  const seen = new Map<string, UpgradePlan>();
  for (const p of plans) seen.set(p.package, p);
  return [...seen.values()].sort((a, b) => a.package.localeCompare(b.package));
}

export async function runUpgradeCommand(argv: string[]): Promise<number> {
  const started = Date.now();
  try {
    const parsed = parseUpgradeArgv(argv);
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }

    const root = await findProjectRoot(process.cwd());
    const plans = await buildUpgradePlan(root, parsed.options.coreOnly);

    if (parsed.options.json) {
      process.stdout.write(`${JSON.stringify({ plans }, null, 2)}\n`);
      return 0;
    }

    if (plans.length === 0) {
      ok("All packages are up to date for the current upgrade target.");
      recordTelemetry({ event: "cli.upgrade", success: true, durationMs: Date.now() - started });
      return 0;
    }

    process.stdout.write("Planned upgrades:\n\n");
    for (const plan of plans) {
      process.stdout.write(`  ${plan.package}: ${plan.from} → ${plan.to} (${plan.reason})\n`);
    }
    process.stdout.write("\nSee docs/1.0/migration-guide-0.4-to-1.0.md before upgrading to 1.0.\n\n");

    if (parsed.options.dryRun || parsed.options.skipInstall) {
      const manager = await detectPackageManager(root);
      for (const plan of plans) {
        const { command, args } = installCommand(manager, `${plan.package}@${plan.to}`);
        process.stdout.write(`[dry-run] ${command} ${args.join(" ")}\n`);
      }
      return 0;
    }

    const proceed =
      !process.stdin.isTTY || (await confirm(`Apply ${plans.length} upgrade(s)?`));
    if (!proceed) {
      warn("Aborted.");
      return 1;
    }

    const manager = await detectPackageManager(root);
    for (const plan of plans) {
      const { command, args } = installCommand(manager, `${plan.package}@${plan.to}`);
      await runCommand(command, args, { cwd: root });
      ok(`${plan.package} → ${plan.to}`);
    }

    process.stdout.write("\nRun `otok doctor` to verify compatibility after upgrade.\n");
    recordTelemetry({
      event: "cli.upgrade",
      success: true,
      durationMs: Date.now() - started,
      pluginCount: plans.length,
    });
    return 0;
  } catch (error) {
    recordTelemetry({
      event: "cli.upgrade",
      success: false,
      durationMs: Date.now() - started,
    });
    fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export { usage as upgradeUsage };
