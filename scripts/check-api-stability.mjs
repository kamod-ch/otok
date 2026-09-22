#!/usr/bin/env node
/**
 * Validates package.json exports against api-stability.json (classifications required).
 */
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeExports, readJson } from "./lib/scan-package-api.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = process.env.OTOK_API_STABILITY_PATH ?? join(root, "api-stability.json");
const manifest = readJson(manifestPath);
const packagesDir = process.env.OTOK_GOVERNANCE_PACKAGES_DIR ?? join(root, "packages");
const errors = [];

function readPackageJson(dir) {
  try {
    return readJson(join(dir, "package.json"));
  } catch {
    return null;
  }
}

function collectPackages() {
  const results = [];
  for (const entry of readdirSync(packagesDir)) {
    const dir = join(packagesDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const pkg = readPackageJson(dir);
    if (pkg?.name) results.push({ dir, pkg });
  }
  return results;
}

for (const { pkg } of collectPackages()) {
  const entry = manifest.packages[pkg.name];
  if (!entry) continue;

  const normalized = normalizeExports(pkg);

  for (const [subpath] of Object.entries(normalized)) {
    const expected = entry.exports?.[subpath];
    if (!expected) {
      errors.push(`${pkg.name} export "${subpath}" is not listed in api-stability.json`);
      continue;
    }
    if (!["public", "experimental", "internal"].includes(expected)) {
      errors.push(`${pkg.name} export "${subpath}" has invalid classification "${expected}"`);
    }
  }

  for (const subpath of Object.keys(entry.exports ?? {})) {
    if (!(subpath in normalized)) {
      errors.push(`${pkg.name} missing documented export "${subpath}" in package.json`);
    }
  }
}

if (errors.length) {
  console.error("API stability errors:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

console.log(`✓ API stability check passed (${Object.keys(manifest.packages).length} packages in manifest)`);
