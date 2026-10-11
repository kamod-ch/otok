#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { percentileNearestRank } from "../request-metrics.mjs";
import {
  assertFiniteMetric,
  gitInfo,
  killProcessTree,
  lockSha256,
  osCpus,
  repoRoot,
  spawnDetached,
  waitForHtmlMarker,
  writeProfileResults,
} from "./common.mjs";

const COLD_RUNS = Number(process.env.BENCH_DEV_COLD_RUNS ?? 5);
const WARM_SAMPLES = Number(process.env.BENCH_DEV_WARM_SAMPLES ?? 5);
const MARKER = process.env.BENCH_DEV_MARKER ?? "Dashboard";
const PORT = Number(process.env.BENCH_DEV_PORT ?? 5198);

export async function measureColdStartMs(port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const t0 = performance.now();
  const child = spawnDetached("pnpm", ["--filter", "playground", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "development" },
  });

  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${baseUrl}/`, { headers: { accept: "text/html" } });
        if (res.status === 200) {
          const body = await res.text();
          if (body.includes(MARKER) && (body.includes("data-island") || body.includes("Island"))) {
            return Math.round(performance.now() - t0);
          }
          if (body.includes(MARKER)) {
            return Math.round(performance.now() - t0);
          }
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("Dev server readiness deadline exceeded");
  } finally {
    await killProcessTree(child);
  }
}

export async function measureWarmHtmlMs(baseUrl, samples) {
  const timings = [];
  for (let i = 0; i < samples; i += 1) {
    const t0 = performance.now();
    const res = await fetch(`${baseUrl}/`, { headers: { accept: "text/html" }, cache: "no-store" });
    if (res.status !== 200) throw new Error(`Warm request failed: HTTP ${res.status}`);
    const body = await res.text();
    if (!body.includes(MARKER)) throw new Error(`Missing marker ${MARKER}`);
    timings.push(performance.now() - t0);
  }
  timings.sort((a, b) => a - b);
  return {
    p50Ms: percentileNearestRank(timings, 50),
    p95Ms: percentileNearestRank(timings, 95),
    sampleCount: timings.length,
  };
}

export async function runDevStartProfile() {
  const coldMs = [];
  for (let i = 0; i < COLD_RUNS; i += 1) {
    const port = PORT + i;
    coldMs.push(await measureColdStartMs(port));
  }
  coldMs.sort((a, b) => a - b);
  const coldP50 = percentileNearestRank(coldMs, 50);
  const coldP95 = percentileNearestRank(coldMs, 95);

  const warmPort = PORT + 100;
  const warmChild = spawnDetached("pnpm", ["--filter", "playground", "dev", "--", "--host", "127.0.0.1", "--port", String(warmPort), "--strictPort"], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "development" },
  });
  const warmBase = `http://127.0.0.1:${warmPort}`;
  let warm;
  try {
    await waitForHtmlMarker(warmBase, { marker: MARKER, deadlineMs: 120_000, path: "/" });
    warm = await measureWarmHtmlMs(warmBase, WARM_SAMPLES);
  } finally {
    await killProcessTree(warmChild);
  }

  const metrics = {
    devServerColdStartP50Ms: assertFiniteMetric(coldP50, "devServerColdStartP50Ms"),
    devServerColdStartP95Ms: assertFiniteMetric(coldP95, "devServerColdStartP95Ms"),
    devServerWarmHtmlP50Ms: assertFiniteMetric(warm.p50Ms, "devServerWarmHtmlP50Ms"),
    devServerWarmHtmlP95Ms: assertFiniteMetric(warm.p95Ms, "devServerWarmHtmlP95Ms"),
    devServerColdSamples: assertFiniteMetric(coldMs.length, "devServerColdSamples"),
    devServerWarmSamples: assertFiniteMetric(warm.sampleCount, "devServerWarmSamples"),
  };

  const { gitSha, dirty } = gitInfo();
  const report = {
    profile: "dev-start",
    generatedAt: new Date().toISOString(),
    gitSha,
    dirty,
    lockfileSha256: lockSha256(),
    nodeVersion: process.version,
    os: { platform: process.platform, arch: process.arch, cpus: osCpus() },
    project: "apps/playground",
    origin: "vite-dev-server",
    methodology: {
      coldRuns: COLD_RUNS,
      warmSamples: WARM_SAMPLES,
      marker: MARKER,
      coldDefinition: "spawn pnpm --filter playground dev until first valid HTML with marker",
      warmDefinition: "same dev process; cache=no-store HTML refetch latency",
      viteCache: "default node_modules/.vite (not cleared between cold runs)",
    },
    metrics,
    scenarios: null,
    navigation: null,
  };

  const path = writeProfileResults(report);
  process.stdout.write(`Wrote ${path}\n${JSON.stringify(metrics, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDevStartProfile().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
