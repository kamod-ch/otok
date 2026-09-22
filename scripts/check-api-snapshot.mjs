#!/usr/bin/env node
/**
 * Compare current declaration export surfaces to docs/governance/api-export-snapshot.json.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { diffSurfaces, readJson, scanPackageSurface } from "./lib/scan-package-api.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = process.env.OTOK_API_STABILITY_PATH ?? join(root, "api-stability.json");
const snapshotPath = process.env.OTOK_API_SNAPSHOT_PATH ?? join(root, "docs/governance/api-export-snapshot.json");
const manifest = readJson(manifestPath);

if (!existsSync(snapshotPath)) {
  console.error(`Missing API snapshot baseline: ${snapshotPath}`);
  console.error("Run: pnpm -r --filter './packages/*' build && pnpm api:snapshot:update");
  process.exit(1);
}

const baseline = readJson(snapshotPath);
const packagesDir = process.env.OTOK_GOVERNANCE_PACKAGES_DIR ?? join(root, "packages");
const errors = [];
const warnings = [];

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

  const current = scanPackageSurface(dir, pkg, manifestEntry);
  const base = baseline.packages?.[pkg.name] ?? {};
  const changes = diffSurfaces(base, current);

  for (const change of changes) {
    const msg =
      change.kind === "removed-subpath"
        ? `${pkg.name}${change.subpath}: export subpath removed`
        : change.kind === "removed-export"
          ? `${pkg.name}${change.subpath}: removed type export "${change.name}"`
          : change.kind === "added-subpath"
            ? `${pkg.name}${change.subpath}: new export subpath (update baseline if intentional)`
            : `${pkg.name}${change.subpath}: added type export "${change.name}" (update baseline if intentional)`;

    if (change.kind.startsWith("removed")) errors.push(msg);
    else warnings.push(msg);
  }
}

if (warnings.length) {
  console.warn("API snapshot warnings (review):\n" + warnings.map((w) => `  ! ${w}`).join("\n"));
}
if (errors.length) {
  console.error("API snapshot errors:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

console.log("✓ API export snapshot check passed");
