#!/usr/bin/env node
/**
 * Otok self-benchmark — measures playground as reference app.
 * Writes benchmarks/results/latest.json
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playground = join(root, "apps/playground");
const resultsDir = join(dirname(fileURLToPath(import.meta.url)), "results");
const outFile = join(resultsDir, "latest.json");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(cmd, args, { stdio: "inherit", cwd: opts.cwd ?? root, shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${cmd} exited ${code}`));
      else resolve(performance.now() - start);
    });
  });
}

function gitSha() {
  try {
    return readFileSync(join(root, ".git/HEAD"), "utf8").trim();
  } catch {
    return process.env.BENCH_GIT_SHA ?? "unknown";
  }
}

function lockHash() {
  const lock = join(root, "pnpm-lock.yaml");
  if (!existsSync(lock)) return "unknown";
  return createHash("sha256").update(readFileSync(lock, "utf8")).digest("hex").slice(0, 12);
}

async function measureSsrLatency(url) {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const res = await fetch(url, { headers: { accept: "text/html" } });
    await res.text();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

async function measureThroughput(url, durationS = 10) {
  try {
    const { default: autocannon } = await import("autocannon");
    const result = await autocannon({ url, duration: durationS, connections: 10 });
    return result.requests.average;
  } catch {
    return null;
  }
}

async function main() {
  mkdirSync(resultsDir, { recursive: true });

  process.stdout.write("Building playground (production)...\n");
  const distDir = join(playground, "dist");
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

  const buildMs = await run("pnpm", ["--filter", "playground", "build"]);

  const metrics = {
    productionBuildMs: Math.round(buildMs),
    devServerStartMs: null,
    ssrLatencyP50Ms: null,
    ssrThroughputRps: null,
    clientJsKb: null,
    edgeBundleKb: null,
    peakRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };

  const baseUrl = process.env.BENCH_URL;
  if (baseUrl) {
    process.stdout.write(`Measuring SSR at ${baseUrl}...\n`);
    metrics.ssrLatencyP50Ms = Math.round(await measureSsrLatency(baseUrl));
    const rps = await measureThroughput(baseUrl);
    if (rps) metrics.ssrThroughputRps = Math.round(rps);
  } else {
    process.stdout.write("Set BENCH_URL to measure SSR latency/throughput (dev/preview server must be running).\n");
  }

  const clientAssets = join(playground, "dist/client");
  if (existsSync(clientAssets)) {
    let total = 0;
    const { gzipSync } = await import("node:zlib");
    const { readdirSync, statSync } = await import("node:fs");
    function walk(dir) {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".js")) total += gzipSync(readFileSync(p)).length;
      }
    }
    walk(clientAssets);
    metrics.clientJsKb = Math.round(total / 1024);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    gitSha: gitSha(),
    nodeVersion: process.version,
    lockfileHash: lockHash(),
    project: "apps/playground",
    metrics,
  };

  writeFileSync(outFile, JSON.stringify(report, null, 2));
  process.stdout.write(`\nWrote ${outFile}\n`);
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
