#!/usr/bin/env node
/**
 * Validates package.json exports against api-stability.json manifest.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "api-stability.json"), "utf8"));

const packagesDir = join(root, "packages");
const errors = [];
const warnings = [];

function readPackageJson(dir) {
  const path = join(dir, "package.json");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
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

  const exportsMap = pkg.exports ?? { ".": pkg.main ?? "./dist/index.js" };
  const normalized =
    typeof exportsMap === "string" ? { ".": exportsMap } : exportsMap;

  for (const [subpath, config] of Object.entries(normalized)) {
    const expected = entry.exports?.[subpath];
    if (!expected) {
      warnings.push(`${pkg.name} export "${subpath}" not listed in api-stability.json`);
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

if (warnings.length) {
  console.warn("API stability warnings:\n" + warnings.map((w) => `  ! ${w}`).join("\n"));
}

if (errors.length) {
  console.error("API stability errors:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

console.log(`✓ API stability check passed (${Object.keys(manifest.packages).length} packages in manifest)`);
