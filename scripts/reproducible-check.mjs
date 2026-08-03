#!/usr/bin/env node
/**
 * Verifies reproducible build environment markers.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockfile = join(root, "pnpm-lock.yaml");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const errors = [];

if (!existsSync(lockfile)) {
  errors.push("pnpm-lock.yaml missing");
}

if (!pkg.packageManager?.startsWith("pnpm@")) {
  errors.push("packageManager field must pin pnpm version");
}

const lockHash = createHash("sha256")
  .update(readFileSync(lockfile, "utf8"))
  .digest("hex")
  .slice(0, 12);

console.log(`Lockfile hash: sha256:${lockHash}`);
console.log(`Node: ${process.version}`);
console.log(`packageManager: ${pkg.packageManager ?? "not set"}`);

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

console.log("✓ Reproducible build environment documented");
