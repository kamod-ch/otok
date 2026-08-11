import { readdir, readFile, access } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { checkCompatibility, findOutdated, resolveExtension } from "@kamod-ch/otok-registry";
import { runRouteTypegen } from "@kamod-ch/otok-route-typegen";
import { loadOtokAppConfig } from "../load-config.js";
import {
  extractPluginsFromConfig,
  extractRequiredEnvVars,
  loadProjectSnapshot,
  loadRegistryForProject,
} from "../registry-context.js";
import { join } from "node:path";
import { confirm, fail, findProjectRoot, ok, warn } from "../utils.js";

export type DoctorSeverity = "error" | "warning" | "info";

export interface DoctorFinding {
  id: string;
  severity: DoctorSeverity;
  message: string;
  fixable?: boolean;
}

export interface DoctorReport {
  findings: DoctorFinding[];
  exitCode: number;
}

function usage(): string {
  return `Usage: otok doctor [options]

Diagnose Otok project health — versions, plugins, compatibility, and security.

Options:
  --json              Print JSON report
  --fix               Apply safe fixes (each change is shown and confirmed)
  --help, -h
`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanClientLeaks(root: string): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  const clientDirs = ["src/client", "src/app/client"].map((d) => join(root, d));
  const leakPatterns = [
    { re: /from\s+["']otok\/server["']/, label: "otok/server" },
    { re: /from\s+["']@kamod-ch\/otok-kysely["']/, label: "@kamod-ch/otok-kysely" },
    { re: /process\.env\.[A-Z0-9_]+/, label: "process.env" },
  ];

  for (const dir of clientDirs) {
    if (!(await pathExists(dir))) continue;
    const files = await walkFiles(dir, [".ts", ".tsx", ".js", ".jsx"]);
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const pattern of leakPatterns) {
        if (pattern.re.test(source)) {
          findings.push({
            id: "client-leak",
            severity: "error",
            message: `Possible server leak in ${file.replace(root + "/", "")}: imports or uses ${pattern.label}.`,
          });
        }
      }
    }
  }
  return findings;
}

async function walkFiles(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkFiles(full, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function checkDuplicatePlugins(plugins: string[]): DoctorFinding[] {
  const seen = new Map<string, number>();
  const findings: DoctorFinding[] = [];
  for (const plugin of plugins) {
    seen.set(plugin, (seen.get(plugin) ?? 0) + 1);
  }
  for (const [plugin, count] of seen) {
    if (count > 1) {
      findings.push({
        id: "duplicate-plugin",
        severity: "error",
        message: `Plugin "${plugin}" appears ${count} times in otok.config.ts.`,
        fixable: false,
      });
    }
  }
  return findings;
}

function checkMiddlewareOrder(configSource: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const middlewareMatch = /middleware\s*:\s*\[([\s\S]*?)\]/m.exec(configSource);
  if (!middlewareMatch) return findings;

  const block = middlewareMatch[1]!;
  const names = [...block.matchAll(/(\w+)/g)].map((m) => m[1]!.toLowerCase());
  const authIdx = names.findIndex((n) => n.includes("auth"));
  const sessionIdx = names.findIndex((n) => n.includes("session"));
  if (authIdx >= 0 && sessionIdx >= 0 && authIdx > sessionIdx) {
    findings.push({
      id: "middleware-order",
      severity: "warning",
      message: "Auth middleware appears after session middleware — verify order matches your auth plugin docs.",
    });
  }
  return findings;
}

async function checkRouteTypes(root: string): Promise<DoctorFinding[]> {
  const candidates = [
    join(root, ".otok", "types", "routes.d.ts"),
    join(root, "src", "types", "routes.d.ts"),
  ];
  for (const file of candidates) {
    if (await pathExists(file)) {
      return [{
        id: "route-types",
        severity: "info",
        message: `Route types found at ${file.replace(root + "/", "")}.`,
      }];
    }
  }
  return [{
    id: "route-types",
    severity: "warning",
    message: "No generated route types found. Run `otok typegen` to generate .otok/types/routes.d.ts.",
    fixable: true,
  }];
}

async function checkDatabase(root: string, plugins: string[]): Promise<DoctorFinding[]> {
  const hasKysely = plugins.some((p) => p.includes("kysely"));
  if (!hasKysely) return [];

  const findings: DoctorFinding[] = [];
  const migrationsDir = join(root, "migrations");
  if (!(await pathExists(migrationsDir))) {
    findings.push({
      id: "database-migrations",
      severity: "warning",
      message: "Kysely plugin registered but no migrations/ directory found.",
    });
  } else {
    const files = await readdir(migrationsDir);
    if (files.length === 0) {
      findings.push({
        id: "database-migrations",
        severity: "info",
        message: "migrations/ exists but is empty.",
      });
    } else {
      findings.push({
        id: "database-migrations",
        severity: "info",
        message: `${files.length} migration file(s) in migrations/.`,
      });
    }
  }
  return findings;
}

function checkMissingEnv(configSource: string | undefined): DoctorFinding[] {
  if (!configSource) return [];
  const required = extractRequiredEnvVars(configSource);
  const findings: DoctorFinding[] = [];
  for (const name of required) {
    if (!process.env[name]) {
      findings.push({
        id: "missing-env",
        severity: "warning",
        message: `Environment variable ${name} is referenced in otok.config.ts but not set.`,
      });
    }
  }
  return findings;
}

function checkAdapter(root: string, adapter: string | undefined): DoctorFinding[] {
  if (adapter) {
    return [{
      id: "adapter",
      severity: "info",
      message: `Detected adapter: ${adapter}.`,
    }];
  }
  return [{
    id: "adapter",
    severity: "warning",
    message: "No otok-adapter-* package found in package.json.",
  }];
}

export async function runDoctorChecks(root: string): Promise<DoctorReport> {
  const project = await loadProjectSnapshot(root);
  const registry = await loadRegistryForProject(root);
  const installed = { ...project.dependencies, ...project.devDependencies };
  const findings: DoctorFinding[] = [];

  if (project.otokVersion) {
    findings.push({
      id: "otok-version",
      severity: "info",
      message: `Otok ${project.otokVersion} installed.`,
    });
  } else {
    findings.push({
      id: "otok-version",
      severity: "warning",
      message: "No otok dependency found in package.json.",
    });
  }

  findings.push(...checkAdapter(root, project.adapter));
  findings.push(...checkDuplicatePlugins(project.plugins));

  for (const plugin of project.plugins) {
    const entry = resolveExtension(registry, plugin);
    const version = installed[plugin]?.replace(/^[\^~>=<]*/, "");
    if (entry) {
      const compat = checkCompatibility(entry, {
        otokVersion: project.otokVersion,
        adapter: project.adapter,
        installedVersion: version,
      });
      for (const err of compat.errors) {
        findings.push({ id: "compat", severity: "error", message: `${plugin}: ${err}` });
      }
      for (const w of compat.warnings) {
        findings.push({ id: "compat", severity: "warning", message: `${plugin}: ${w}` });
      }
    } else if (plugin.startsWith("@kamod-ch/otok-") || plugin.startsWith("@otok/")) {
      findings.push({
        id: "registry",
        severity: "info",
        message: `${plugin} is not listed in the extension registry.`,
      });
    }
  }

  const outdated = findOutdated(installed, registry.extensions);
  for (const row of outdated) {
    findings.push({
      id: "outdated",
      severity: "warning",
      message: `${row.name} is outdated (${row.installed} → ${row.latest}).`,
    });
  }

  findings.push(...checkMissingEnv(project.configSource));
  findings.push(...(await scanClientLeaks(root)));
  if (project.configSource) {
    findings.push(...checkMiddlewareOrder(project.configSource));
  }
  findings.push(...(await checkRouteTypes(root)));
  findings.push(...(await checkDatabase(root, project.plugins)));

  const hasKysely = project.plugins.some((p) => p.includes("kysely"));
  if (hasKysely && project.adapter === "static") {
    findings.push({
      id: "capabilities",
      severity: "error",
      message: "Kysely database plugin with static adapter — database capabilities unavailable at runtime.",
    });
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const exitCode = errors > 0 ? 1 : warnings > 0 ? 0 : 0;

  return { findings, exitCode: errors > 0 ? 1 : 0 };
}

async function applyFixes(root: string, findings: DoctorFinding[]): Promise<void> {
  const fixable = findings.filter((f) => f.fixable);
  if (fixable.length === 0) {
    process.stdout.write("No automatic fixes available.\n");
    return;
  }

  for (const finding of fixable) {
    if (finding.id === "route-types") {
      process.stdout.write("Fix: run route typegen → .otok/types/routes.d.ts\n");
      const proceed = process.stdin.isTTY ? await confirm("Apply route typegen?") : false;
      if (!proceed) continue;

      const config = await loadOtokAppConfig(root);
      const result = runRouteTypegen({
        root,
        routesDir: config.routesDir ?? "src/app/routes",
        outputDir: ".otok/types",
        strict: false,
      });
      ok(`Generated ${result.files.length} type file(s).`);
    }
  }
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = ["Otok Doctor", "===========", ""];
  const icon = (s: DoctorSeverity) => (s === "error" ? "✗" : s === "warning" ? "!" : "·");

  for (const finding of report.findings) {
    lines.push(`${icon(finding.severity)} ${finding.message}`);
  }

  const errors = report.findings.filter((f) => f.severity === "error").length;
  const warnings = report.findings.filter((f) => f.severity === "warning").length;
  lines.push("");
  lines.push(`${report.findings.length} check(s): ${errors} error(s), ${warnings} warning(s).`);
  if (warnings > 0 || errors > 0) {
    lines.push("");
    lines.push("Tip: run `otok upgrade --dry-run` to see available package upgrades.");
  }
  return lines.join("\n");
}

export async function runDoctorCommand(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  try {
    const root = await findProjectRoot(process.cwd());
    const report = await runDoctorChecks(root);

    if (argv.includes("--json")) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatDoctorReport(report)}\n`);
    }

    if (argv.includes("--fix")) {
      await applyFixes(root, report.findings);
    }

    return report.exitCode;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export { usage as doctorUsage };
