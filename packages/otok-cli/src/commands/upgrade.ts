import { resolveExtension } from "@kamod-ch/otok-registry";
import {
  compareVersions,
  CORE_UPGRADE_PACKAGE_NAMES,
  hasConflictingCorePackages,
  isUnsupportedVersionSpec,
  LEGACY_CORE_PACKAGE_NAME,
  parseInstalledVersion,
  CORE_PACKAGE_NAME,
} from "../package-identities.js";
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

export interface UpgradePlanResult {
  plans: UpgradePlan[];
  diagnostics: string[];
}

const CORE_UPGRADE_SET = new Set<string>(CORE_UPGRADE_PACKAGE_NAMES);

function usage(): string {
  return `Usage: otok upgrade [options]

Upgrade Otok core, adapters, and registry-tracked extensions.

Options:
  --dry-run           Show planned upgrades without installing
  --skip-install      Print commands only
  --core-only         Upgrade core, vite-plugin, cli, and adapters only
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
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-install") {
      options.skipInstall = true;
      continue;
    }
    if (arg === "--core-only") {
      options.coreOnly = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}".`);
  }
  return { options, plans: null as UpgradePlan[] | null };
}

function resolveRegistryTarget(
  registry: Awaited<ReturnType<typeof loadRegistryForProject>>,
  packageName: string,
): string | undefined {
  return resolveExtension(registry, packageName)?.version;
}

export async function buildUpgradePlan(root: string, coreOnly = false): Promise<UpgradePlanResult> {
  const project = await loadProjectSnapshot(root);
  const registry = await loadRegistryForProject(root);
  const installed = { ...project.dependencies, ...project.devDependencies };
  const plans: UpgradePlan[] = [];
  const diagnostics: string[] = [];

  if (hasConflictingCorePackages(installed)) {
    diagnostics.push(
      "Conflicting core dependencies: both @kamod-ch/otok and legacy otok are declared — remove one before upgrading.",
    );
  }

  for (const pkg of CORE_UPGRADE_PACKAGE_NAMES) {
    if (pkg === LEGACY_CORE_PACKAGE_NAME && installed[CORE_PACKAGE_NAME]) {
      continue;
    }
    const spec = installed[pkg];
    if (!spec) continue;

    if (isUnsupportedVersionSpec(spec)) {
      diagnostics.push(
        `${pkg}: unsupported version spec "${spec}" — registry upgrades require semver or range specs (not workspace/link/git).`,
      );
      continue;
    }

    const current = parseInstalledVersion(spec);
    if (!current) continue;

    const target = resolveRegistryTarget(registry, pkg);
    if (!target) {
      diagnostics.push(`${pkg}: no upgrade target in the bundled registry snapshot.`);
      continue;
    }

    if (compareVersions(current, target) >= 0) {
      continue;
    }

    plans.push({
      package: pkg,
      from: current,
      to: target,
      reason:
        pkg === LEGACY_CORE_PACKAGE_NAME ? "Registry snapshot (legacy otok package name)" : "Registry snapshot target",
    });
  }

  if (!coreOnly) {
    for (const ext of registry.extensions) {
      if (CORE_UPGRADE_SET.has(ext.name)) continue;
      const spec = installed[ext.name];
      if (!spec) continue;

      if (isUnsupportedVersionSpec(spec)) {
        diagnostics.push(`${ext.name}: unsupported version spec "${spec}".`);
        continue;
      }

      const current = parseInstalledVersion(spec);
      if (!current) continue;

      if (compareVersions(current, ext.version) >= 0) {
        continue;
      }

      plans.push({
        package: ext.name,
        from: current,
        to: ext.version,
        reason: ext.deprecated ? "Deprecated — upgrade recommended" : "Registry latest",
      });
    }
  }

  return { plans: dedupePlans(plans), diagnostics };
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
    const { plans, diagnostics } = await buildUpgradePlan(root, parsed.options.coreOnly);

    if (parsed.options.json) {
      process.stdout.write(`${JSON.stringify({ plans, diagnostics }, null, 2)}\n`);
      return 0;
    }

    for (const message of diagnostics) {
      warn(message);
    }

    if (plans.length === 0) {
      if (diagnostics.length > 0) {
        warn("No upgrades planned — resolve the diagnostics above.");
        recordTelemetry({ event: "cli.upgrade", success: false, durationMs: Date.now() - started });
        return 1;
      }
      ok("All installed packages match the current registry snapshot targets.");
      recordTelemetry({ event: "cli.upgrade", success: true, durationMs: Date.now() - started });
      return 0;
    }

    process.stdout.write("Planned upgrades:\n\n");
    for (const plan of plans) {
      process.stdout.write(`  ${plan.package}: ${plan.from} → ${plan.to} (${plan.reason})\n`);
    }
    process.stdout.write("\n");

    if (parsed.options.dryRun || parsed.options.skipInstall) {
      const manager = await detectPackageManager(root);
      for (const plan of plans) {
        const { command, args } = installCommand(manager, `${plan.package}@${plan.to}`);
        process.stdout.write(`[dry-run] ${command} ${args.join(" ")}\n`);
      }
      return 0;
    }

    const proceed = !process.stdin.isTTY || (await confirm(`Apply ${plans.length} upgrade(s)?`));
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
