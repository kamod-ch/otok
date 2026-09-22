#!/usr/bin/env node
/**
 * Measure gzip sizes for playground bundle entries (after `pnpm --filter playground build`).
 */
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playgroundDist = join(root, "apps/playground/dist");
const outFile =
  process.env.OTOK_BUNDLE_RESULTS_PATH ?? join(root, "benchmarks/results/bundles.json");

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function walkJsFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJsFiles(p, acc);
    else if (name.endsWith(".js")) acc.push(p);
  }
  return acc;
}

function relFrom(root, file) {
  return file.slice(root.length + 1);
}

const entries = {};
const clientRoot = join(playgroundDist, "client");
for (const file of walkJsFiles(clientRoot)) {
  entries[`client/${relFrom(clientRoot, file)}`] = {
    rawBytes: statSync(file).size,
    gzipBytes: gzipSize(file),
  };
}

const serverRoot = join(playgroundDist, "server");
for (const file of walkJsFiles(serverRoot)) {
  entries[`server/${relFrom(serverRoot, file)}`] = {
    rawBytes: statSync(file).size,
    gzipBytes: gzipSize(file),
  };
}

let clientJsGzipTotal = 0;
for (const [key, v] of Object.entries(entries)) {
  if (key.startsWith("client/") && key.endsWith(".js")) clientJsGzipTotal += v.gzipBytes;
}

const report = {
  generatedAt: new Date().toISOString(),
  project: "apps/playground",
  entries,
  aggregates: {
    clientJsGzipKb: Math.round(clientJsGzipTotal / 1024),
  },
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
console.log(`clientJsGzipKb=${report.aggregates.clientJsGzipKb}`);
