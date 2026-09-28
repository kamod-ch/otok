#!/usr/bin/env node
/**
 * Ensure published UI chunks do not reference DB drivers or React/Radix runtimes.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiRoot = join(pkgRoot, "dist/ui");

const forbidden = [
  /\bfrom\s+["']kysely["']/,
  /\bfrom\s+["']pg["']/,
  /\bfrom\s+["']better-sqlite3["']/,
  /\bfrom\s+["']react["']/,
  /\bfrom\s+["']react-dom["']/,
  /\b@radix-ui\//,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = walk(uiRoot);
const hits = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(src)) {
      hits.push({ file, pattern: String(pattern) });
    }
  }
}

if (hits.length) {
  console.error("UI artifact verification failed:");
  for (const h of hits) console.error(`  ${h.file} matched ${h.pattern}`);
  process.exit(1);
}

console.log(`✓ UI artifacts clean (${files.length} files scanned, no DB/React/Radix imports)`);
