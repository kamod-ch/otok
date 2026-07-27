import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PackageRange {
  name: string;
  minimum: string;
  optional?: boolean;
}

export interface VersionIssue {
  packageName: string;
  installed?: string;
  required: string;
  message: string;
}

const CORE_PACKAGES: PackageRange[] = [
  { name: "@kamod-ch/ui", minimum: "1.0.0" },
  { name: "preact", minimum: "10.26.0" },
  { name: "@preact/signals", minimum: "2.0.0" },
  { name: "tailwindcss", minimum: "4.0.0" },
  { name: "@tailwindcss/vite", minimum: "4.0.0" },
];

const OPTIONAL_PACKAGES: PackageRange[] = [
  { name: "@kamod-ch/themes", minimum: "0.2.0", optional: true },
  { name: "@kamod-ch/icons", minimum: "1.0.0", optional: true },
  { name: "@kamod-ch/signals", minimum: "1.0.0", optional: true },
  { name: "@kamod-ch/hooks", minimum: "1.0.0", optional: true },
];

function parseVersion(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function satisfiesMinimum(installed: string, minimum: string): boolean {
  const left = parseVersion(installed);
  const right = parseVersion(minimum);
  if (!left || !right) return true;
  for (let index = 0; index < 3; index += 1) {
    if (left[index]! > right[index]!) return true;
    if (left[index]! < right[index]!) return false;
  }
  return true;
}

export async function readInstalledVersion(root: string, packageName: string): Promise<string | undefined> {
  try {
    const pkgPath = join(root, "node_modules", ...packageName.split("/"), "package.json");
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
}

export async function checkKamodVersions(
  root: string,
  packages: PackageRange[] = [...CORE_PACKAGES, ...OPTIONAL_PACKAGES],
): Promise<VersionIssue[]> {
  const issues: VersionIssue[] = [];

  for (const entry of packages) {
    const installed = await readInstalledVersion(root, entry.name);
    if (!installed) {
      if (entry.optional) continue;
      issues.push({
        packageName: entry.name,
        required: `>=${entry.minimum}`,
        message: `Missing required package "${entry.name}". Install it alongside @kamod-ch/otok-kamod.`,
      });
      continue;
    }

    if (!satisfiesMinimum(installed, entry.minimum)) {
      issues.push({
        packageName: entry.name,
        installed,
        required: `>=${entry.minimum}`,
        message:
          `Incompatible ${entry.name}@${installed} — @kamod-ch/otok-kamod requires >=${entry.minimum}. ` +
          `Upgrade with your package manager before building.`,
      });
    }
  }

  return issues;
}

export function formatVersionIssues(issues: VersionIssue[]): string {
  return issues.map((issue) => `- ${issue.message}`).join("\n");
}

export { CORE_PACKAGES, OPTIONAL_PACKAGES };
