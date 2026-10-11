#!/usr/bin/env node
/**
 * Local Worker upload bundle measurement (wrangler deploy --dry-run, no Cloud login).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.WRANGLER_BUNDLE_OUTDIR ?? join(root, ".wrangler", "bench-upload-bundle");
const reportPath =
  process.env.OTOK_WORKER_BUNDLE_REPORT_PATH ?? join(root, "benchmark-worker-bundle.json");

function walkFiles(dir, base = dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) entries.push(...walkFiles(full, base));
    else entries.push({ rel: relative(base, full), full, size: st.size });
  }
  return entries;
}

function isUploadModule(rel) {
  const lower = rel.toLowerCase();
  if (lower.includes("/assets/") || lower.startsWith("assets/")) return false;
  return /\.(m?js|wasm|json)$/.test(lower) && !lower.endsWith("manifest.json");
}

export function summarizeBundleDirectory(dir) {
  if (!existsSync(dir)) throw new Error(`Bundle outdir missing: ${dir}`);
  const files = walkFiles(dir);
  let rawBytes = 0;
  let gzipBytes = 0;
  const modules = [];
  let assetBytes = 0;
  for (const file of files) {
    const buf = readFileSync(file.full);
    const gz = gzipSync(buf).length;
    if (isUploadModule(file.rel)) {
      rawBytes += file.size;
      gzipBytes += gz;
      modules.push({ path: file.rel, rawBytes: file.size, gzipBytes: gz });
    } else {
      assetBytes += file.size;
    }
  }
  return {
    rawBytes,
    gzipBytes,
    rawKiB: rawBytes / 1024,
    gzipKiB: gzipBytes / 1024,
    moduleCount: modules.length,
    assetBytesSeparate: assetBytes,
    modules,
    artifactHash: createHash("sha256").update(JSON.stringify(modules.map((m) => [m.path, m.rawBytes]))).digest("hex"),
  };
}

function main() {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const build = spawnSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);

  const dry = spawnSync("pnpm", ["exec", "wrangler", "deploy", "--dry-run", `--outdir=${outDir}`], {
    cwd: root,
    stdio: "inherit",
  });
  if (dry.status !== 0) {
    console.error("wrangler deploy --dry-run failed");
    process.exit(dry.status ?? 1);
  }

  const summary = summarizeBundleDirectory(outDir);
  const report = {
    generatedAt: new Date().toISOString(),
    project: "examples/deployment/cloudflare",
    outDir,
    tool: "wrangler deploy --dry-run",
    ...summary,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Wrote ${reportPath}\n`);
  process.stdout.write(
    `edge upload modules: ${summary.moduleCount} files, ${summary.rawKiB.toFixed(2)} KiB raw, ${summary.gzipKiB.toFixed(2)} KiB gzip\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
