import type { CompatibilityResult, ExtensionEntry, RuntimeTarget } from "./schema.js";
import { satisfiesRange } from "./semver.js";

export interface ProjectContext {
  otokVersion?: string;
  adapter?: "node" | "cloudflare" | "static";
  runtime?: RuntimeTarget;
  installedVersion?: string;
}

export function checkCompatibility(
  entry: ExtensionEntry,
  project: ProjectContext,
): CompatibilityResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (project.otokVersion && !satisfiesRange(project.otokVersion, entry.otokVersion)) {
    errors.push(
      `Requires Otok ${entry.otokVersion}, project has ${project.otokVersion}.`,
    );
  }

  if (entry.deprecated) {
    warnings.push(
      entry.deprecationMessage ??
        `Package is deprecated${entry.successor ? ` — use ${entry.successor}` : ""}.`,
    );
  }

  if (entry.maintenanceStatus === "abandoned") {
    warnings.push("Maintenance status: abandoned.");
  } else if (entry.maintenanceStatus === "deprecated") {
    warnings.push("Maintenance status: deprecated.");
  }

  if (entry.qualityStatus === "experimental") {
    warnings.push("Quality status: experimental — review before production use.");
  }

  if (project.adapter && !entry.adapters.includes(project.adapter)) {
    errors.push(
      `Adapter "${project.adapter}" not supported (supports: ${entry.adapters.join(", ")}).`,
    );
  }

  if (project.runtime && !entry.runtime.includes(project.runtime)) {
    errors.push(
      `Runtime "${project.runtime}" not supported (supports: ${entry.runtime.join(", ")}).`,
    );
  }

  if (
    project.installedVersion &&
    project.installedVersion !== entry.version &&
    !satisfiesRange(project.installedVersion, `^${entry.version.split(".").slice(0, 2).join(".")}.0`)
  ) {
    warnings.push(
      `Installed ${project.installedVersion}, registry latest ${entry.version}.`,
    );
  }

  for (const note of entry.securityNotes) {
    warnings.push(`Security: ${note}`);
  }

  return { compatible: errors.length === 0, warnings, errors };
}

export function findOutdated(
  installed: Record<string, string>,
  registryExtensions: ExtensionEntry[],
): { name: string; installed: string; latest: string }[] {
  const outdated: { name: string; installed: string; latest: string }[] = [];
  for (const ext of registryExtensions) {
    const current = installed[ext.name];
    if (!current) continue;
    if (current !== ext.version) {
      outdated.push({ name: ext.name, installed: current, latest: ext.version });
    }
  }
  return outdated.sort((a, b) => a.name.localeCompare(b.name));
}
