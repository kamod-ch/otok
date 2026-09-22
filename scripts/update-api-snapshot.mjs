#!/usr/bin/env node
/**
 * Regenerate docs/governance/api-export-snapshot.json from built package .d.ts surfaces.
 */
import { writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, scanPackageSurface } from "./lib/scan-package-api.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readJson(process.env.OTOK_API_STABILITY_PATH ?? join(root, "api-stability.json"));
const outPath = join(root, "docs/governance/api-export-snapshot.json");
const packagesDir = join(root, "packages");

const snapshot = {
  version: 1,
  baselineRelease: manifest.version ?? "workspace",
  generatedAt: new Date().toISOString(),
  note: "Review aid for public/experimental export surfaces — not a semver proof.",
  packages: {},
};

for (const entry of readdirSync(packagesDir)) {
  const dir = join(packagesDir, entry);
  if (!statSync(dir).isDirectory()) continue;
  let pkg;
  try {
    pkg = readJson(join(dir, "package.json"));
  } catch {
    continue;
  }
  const manifestEntry = manifest.packages[pkg.name];
  if (!manifestEntry) continue;
  snapshot.packages[pkg.name] = scanPackageSurface(dir, pkg, manifestEntry);
}

writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
