import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MergedKitPlan, MergedPresetPlan, PresetFileEntry } from "@kamod-ch/otok-config";
import { findMonorepoPackagesDir, KNOWN_KIT_PACKAGES, resolveKitPackageRoot } from "./kit-registry.js";
import { resolveLayerDir } from "./scaffold-utils.js";

const createOtokRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildSourceRoots(layerNames: string[]): Record<string, string> {
  const packagesDir = findMonorepoPackagesDir(createOtokRoot);
  const roots: Record<string, string> = {};

  for (const kitName of KNOWN_KIT_PACKAGES) {
    const root = resolveKitPackageRoot(kitName, packagesDir);
    if (root) roots[kitName] = root;
  }

  for (const layerName of layerNames) {
    const key = layerName.replace(/^layer:/, "");
    try {
      roots[layerName] = resolveLayerDir(key);
    } catch {
      // layer may be deps-only
    }
  }

  roots["__packages__"] = packagesDir;
  roots["__create_otok__"] = createOtokRoot;
  return roots;
}

export function applyPresetFiles(
  targetRoot: string,
  plan: MergedPresetPlan,
  sourceRoots: Record<string, string>,
  localOverrides = new Map<string, string>(),
): string[] {
  const written: string[] = [];

  for (const entry of plan.files) {
    const dest = path.join(targetRoot, entry.to);
    if (localOverrides.has(entry.to)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(localOverrides.get(entry.to)!, dest);
      written.push(entry.to);
      continue;
    }

    const sourceRoot = resolveSourceRoot(entry, sourceRoots);
    if (!sourceRoot) continue;

    const from = path.join(sourceRoot, entry.from);
    if (!fs.existsSync(from)) continue;

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(from, dest);
    written.push(entry.to);
  }

  return written;
}

function resolveSourceRoot(
  entry: PresetFileEntry,
  sourceRoots: Record<string, string>,
): string | undefined {
  for (const [key, root] of Object.entries(sourceRoots)) {
    if (key.startsWith("__")) continue;
    if (fs.existsSync(path.join(root, entry.from))) return root;
  }

  for (const key of ["__packages__", "__create_otok__"] as const) {
    const root = sourceRoots[key];
    if (root && fs.existsSync(path.join(root, entry.from))) return root;
  }

  for (const root of Object.values(sourceRoots)) {
    if (fs.existsSync(path.join(root, entry.from))) return root;
  }

  return undefined;
}

export function writeKitManifest(
  targetRoot: string,
  plan: MergedKitPlan | (MergedPresetPlan & { kits?: string[]; migrations?: unknown[]; conflicts?: unknown[] }),
): void {
  const manifest = {
    kits: "kits" in plan && plan.kits ? plan.kits : [],
    chain: plan.chain,
    migrations: "migrations" in plan && plan.migrations ? plan.migrations : [],
    permissions: "permissions" in plan ? plan.permissions : [],
    conflicts: "conflicts" in plan ? plan.conflicts : [],
    files: plan.files.map((f) => f.to),
    generatedAt: new Date().toISOString(),
  };
  const dir = path.join(targetRoot, ".otok");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "kit-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

export function assertNoBlockingConflicts(plan: MergedKitPlan): void {
  const blocking = plan.conflicts.filter((c) => c.type === "incompatible_kits" || c.type === "duplicate_route");
  if (blocking.length > 0) {
    throw new Error(`otok: kit conflict — ${blocking[0]!.message}`);
  }
}

export { createOtokRoot };
