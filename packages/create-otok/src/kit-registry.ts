import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { OtokKitDefinition } from "@otok/config";

/** Presets that auto-compose business kits during scaffold. */
export const PRESET_KIT_MAP: Record<
  string,
  { kits: string[]; modules?: Record<string, readonly string[]> }
> = {
  "@otok/preset-crm": {
    kits: ["@otok/kit-crm"],
    modules: { "@otok/kit-crm": ["pipelines", "import-export"] },
  },
};

export const KNOWN_KIT_PACKAGES = [
  "@otok/kit-crm",
  "@otok/kit-admin",
  "@otok/kit-saas",
  "@otok/kit-marketplace",
  "@otok/kit-content",
] as const;

/** Map npm package name to monorepo folder (e.g. @otok/kit-crm → otok-kit-crm). */
export function kitFolderName(packageName: string): string {
  const short = packageName.replace(/^@otok\//, "");
  if (short.startsWith("kit-")) return `otok-${short}`;
  return `otok-kit-${short}`;
}

/** Resolve kit package root — monorepo sibling or node_modules. */
export function resolveKitPackageRoot(packageName: string, searchFrom: string): string | null {
  const folder = kitFolderName(packageName);
  const candidates = [
    path.join(searchFrom, folder),
    path.join(searchFrom, "packages", folder),
    path.join(searchFrom, "node_modules", packageName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  }
  return null;
}

export function kitsForPreset(presetName: string, explicitKits: string[] = []): string[] {
  const mapped = PRESET_KIT_MAP[presetName]?.kits ?? [];
  return [...new Set([...mapped, ...explicitKits])];
}

export function modulesForPreset(
  presetName: string,
  explicit: Record<string, readonly string[]> = {},
): Record<string, readonly string[]> {
  const mapped = PRESET_KIT_MAP[presetName]?.modules ?? {};
  return { ...mapped, ...explicit };
}

export async function loadKitDefinition(
  packageName: string,
  searchFrom: string,
): Promise<OtokKitDefinition | null> {
  const root = resolveKitPackageRoot(packageName, searchFrom);
  if (!root) return null;

  const distKit = path.join(root, "dist/kit.js");
  const srcKit = path.join(root, "src/kit.ts");
  const entry = fs.existsSync(distKit) ? distKit : fs.existsSync(srcKit) ? srcKit : null;
  if (!entry) return null;

  const mod = (await import(pathToFileURL(entry).href)) as { default: OtokKitDefinition };
  return mod.default ?? null;
}

export async function loadKitDefinitions(
  names: string[],
  searchFrom: string,
): Promise<OtokKitDefinition[]> {
  const kits: OtokKitDefinition[] = [];
  for (const name of names) {
    const kit = await loadKitDefinition(name, searchFrom);
    if (!kit) {
      throw new Error(
        `otok: kit "${name}" not found. Install it or run from the otok monorepo with packages built.`,
      );
    }
    kits.push(kit);
  }
  return kits;
}

export function findMonorepoPackagesDir(createOtokRoot: string): string {
  const sibling = path.join(createOtokRoot, "..");
  if (fs.existsSync(path.join(sibling, "otok-kit-crm"))) return sibling;
  if (fs.existsSync(path.join(sibling, "packages", "otok-kit-crm"))) return path.join(sibling, "packages");
  return sibling;
}
