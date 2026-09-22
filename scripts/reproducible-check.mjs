#!/usr/bin/env node
/**
 * Verifies deterministic builds: two clean builds of the same package produce identical artifacts.
 */
import { readFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockfile = join(root, "pnpm-lock.yaml");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const targetPackage = process.env.OTOK_REPRO_PACKAGE ?? "packages/otok-config";
const filter = process.env.OTOK_REPRO_FILTER ?? "@kamod-ch/otok-config";

const errors = [];

if (!existsSync(lockfile)) errors.push("pnpm-lock.yaml missing");
if (!pkg.packageManager?.startsWith("pnpm@")) errors.push("packageManager field must pin pnpm version");

function normalizeContent(relPath, buf) {
  let text = buf.toString("utf8");
  if (relPath.endsWith(".map")) {
    text = text.replace(/"mappings":"[^"]*"/, '"mappings":""');
  }
  return text;
}

function hashTree(distDir) {
  const hashes = {};
  if (!existsSync(distDir)) return hashes;
  function walk(dir, prefix = "") {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(p).isDirectory()) walk(p, rel);
      else if (name.endsWith(".js") || name.endsWith(".d.ts")) {
        const normalized = normalizeContent(rel, readFileSync(p));
        hashes[rel] = createHash("sha256").update(normalized).digest("hex");
      }
    }
  }
  walk(distDir);
  return hashes;
}

function cleanBuild() {
  const distPath = join(root, targetPackage, "dist");
  rmSync(distPath, { recursive: true, force: true });
  const env = { ...process.env, SOURCE_DATE_EPOCH: "1700000000", NODE_ENV: "production" };
  const build = spawnSync("pnpm", ["--filter", filter, "build"], { cwd: root, env, stdio: "pipe", encoding: "utf8" });
  if (build.status !== 0) {
    throw new Error(`build failed: ${build.stderr}`);
  }
  return hashTree(distPath);
}

console.log(`Lockfile hash: sha256:${createHash("sha256").update(readFileSync(lockfile, "utf8")).digest("hex").slice(0, 12)}`);
console.log(`Node: ${process.version}`);
console.log(`packageManager: ${pkg.packageManager ?? "not set"}`);
console.log(`Repro target: ${filter} (${targetPackage})`);

try {
  const a = cleanBuild();
  const b = cleanBuild();
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of [...keys].sort()) {
    if (a[key] !== b[key]) {
      errors.push(`Artifact mismatch ${key}: ${a[key]?.slice(0, 12)} vs ${b[key]?.slice(0, 12)}`);
    }
  }
} catch (error) {
  errors.push(error.message);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

console.log("✓ Reproducible build check passed (dual clean builds matched)");
