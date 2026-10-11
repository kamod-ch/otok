#!/usr/bin/env node
/**
 * Otok production benchmark — builds playground, starts production server, measures SSR + bundles.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { cpus } from "node:os";
import { measureLatencySeries, measureThroughputRps } from "./request-metrics.mjs";
import { platformSupportsProcRss, samplePeakTreeRss } from "./process-metrics.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playground = join(root, "apps/playground");
const resultsDir = join(dirname(fileURLToPath(import.meta.url)), "results");
const profile = process.env.BENCH_PROFILE ?? "production";

const profileRunners = {
  "dev-start": () => import("./profiles/dev-start.mjs").then((m) => m.runDevStartProfile()),
  "worker-bundle": () => import("./profiles/worker-bundle.mjs").then((m) => m.runWorkerBundleProfile()),
  database: () => import("./profiles/database.mjs").then((m) => m.runDatabaseProfile()),
};

async function runSelectedProfile() {
  const runner = profileRunners[profile];
  if (runner) {
    await runner();
    return true;
  }
  return false;
}

function gitInfo() {
  const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return {
    gitSha: sha.status === 0 ? sha.stdout.trim() : process.env.BENCH_GIT_SHA ?? "unknown",
    dirty: dirty.status === 0 ? dirty.stdout.trim().length > 0 : null,
  };
}

function lockSha256() {
  const lock = join(root, "pnpm-lock.yaml");
  if (!existsSync(lock)) return "unknown";
  return createHash("sha256").update(readFileSync(lock, "utf8")).digest("hex");
}

async function waitForHealth(baseUrl, deadlineMs = 30_000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        const json = await res.json();
        if (json?.ok === true) return;
      }
    } catch {
      // retry
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for health at ${baseUrl}`);
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  await delay(500);
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    if (!child.killed) child.kill("SIGKILL");
  }
  await new Promise((resolve) => child.on("close", resolve));
}

async function main() {
  if (await runSelectedProfile()) return;

  if (!platformSupportsProcRss()) {
    console.error("✗ Production benchmark requires Linux /proc for process-tree RSS (no controller fallback).");
    process.exit(1);
  }

  const runId = randomUUID();
  const stagingDir = join(resultsDir, `.staging-${runId}`);
  mkdirSync(stagingDir, { recursive: true });
  const outFile = join(stagingDir, "latest.json");
  const bundlesStaging = join(stagingDir, "bundles.json");

  const distDir = join(playground, "dist");
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

  process.stdout.write("Building playground (production) with RSS sampling...\n");
  const buildStartedMs = Date.now();
  const buildTimerStart = performance.now();
  const child = spawn("pnpm", ["--filter", "playground", "build"], {
    cwd: root,
    stdio: "inherit",
    detached: true,
  });
  let buildSamplingStop = false;
  const buildRssPromise = samplePeakTreeRss(child.pid, {
    intervalMs: 10,
    shouldStop: () => buildSamplingStop,
  });
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
  });
  buildSamplingStop = true;
  const buildRss = await buildRssPromise;
  const productionBuildMs = Math.round(performance.now() - buildTimerStart);

  const port = Number(process.env.BENCH_PORT ?? 4188);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("node", ["dist/server/server.js"], {
    cwd: playground,
    env: { ...process.env, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  });

  let serverSamplingStop = false;
  const serverRssPromise = samplePeakTreeRss(server.pid, {
    intervalMs: 10,
    shouldStop: () => serverSamplingStop,
  });

  try {
    await waitForHealth(baseUrl);

    const scenarios = {};
    for (const [key, spec] of Object.entries({
      home: { path: "/", marker: "Dashboard" },
      about: { path: "/about", marker: "Zero JS" },
    })) {
      const url = `${baseUrl}${spec.path}`;
      const latency = await measureLatencySeries(url, { warmup: 20, samples: 200, marker: spec.marker });
      const throughput = await measureThroughputRps(url, {
        durationMs: 10_000,
        concurrency: 10,
        marker: spec.marker,
      });
      scenarios[key] = {
        ssrLatencyP50Ms: Math.round(latency.p50Ms * 100) / 100,
        ssrLatencyP95Ms: Math.round(latency.p95Ms * 100) / 100,
        ssrThroughputRps: Math.round(throughput.rps * 100) / 100,
        requestErrors: throughput.errors,
      };
    }

    serverSamplingStop = true;
    const serverRss = await serverRssPromise;

    const { gitSha, dirty } = gitInfo();
    const report = {
      runId,
      profile,
      generatedAt: new Date().toISOString(),
      startedAt: new Date(buildStartedMs).toISOString(),
      gitSha,
      dirty,
      lockfileSha256: lockSha256(),
      nodeVersion: process.version,
      pnpmVersion: process.env.npm_config_user_agent ?? null,
      os: { platform: process.platform, arch: process.arch, cpus: osCpus() },
      runnerProfile: profile,
      project: "apps/playground",
      buildCommand: "pnpm --filter playground build",
      serverCommand: "node dist/server/server.js",
      baseUrl,
      methodology: {
        rss: buildRss.method,
        rssSamplingIntervalMs: buildRss.samplingIntervalMs,
        ssrWarmupRequests: 20,
        ssrSampleCount: 200,
        throughputDurationMs: 10_000,
        throughputConcurrency: 10,
        quantile: "nearest-rank p50/p95",
      },
      artifactHash: null,
      metrics: {
        productionBuildMs,
        buildPeakRssMb: Math.round((buildRss.peakRssKb / 1024) * 100) / 100,
        serverPeakRssMb: Math.round((serverRss.peakRssKb / 1024) * 100) / 100,
        clientJsGzipKiB: null,
      },
      scenarios,
      navigation: null,
    };

    process.env.OTOK_BENCH_RUN_ID = runId;
    process.env.BENCH_URL = baseUrl;
    process.env.OTOK_BUNDLE_RESULTS_PATH = bundlesStaging;
    const measure = spawnSync(process.execPath, [join(root, "scripts/measure-bundle-budgets.mjs")], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    if (measure.status !== 0) throw new Error("bundle measurement failed");

    const bundles = JSON.parse(readFileSync(bundlesStaging, "utf8"));
    report.artifactHash = bundles.artifactHash ?? null;
    report.metrics.clientJsGzipKiB = bundles.aggregates?.clientJsGzipKiB;

    if (profile === "navigation") {
      const nav = spawnSync(
        "pnpm",
        ["exec", "playwright", "test", "--config", "benchmark/playwright.config.ts"],
        {
          cwd: playground,
          stdio: "inherit",
          env: { ...process.env, BENCH_URL: baseUrl },
        },
      );
      if (nav.status !== 0) throw new Error("navigation profile playwright tests failed");
      const navFile = join(resultsDir, "navigation.json");
      if (existsSync(navFile)) {
        report.navigation = JSON.parse(readFileSync(navFile, "utf8"));
      }
    }

    writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
    const finalLatest = join(resultsDir, "latest.json");
    const finalBundles = join(resultsDir, "bundles.json");
    if (existsSync(finalLatest)) rmSync(finalLatest);
    if (existsSync(finalBundles)) rmSync(finalBundles);
    renameSync(outFile, finalLatest);
    renameSync(bundlesStaging, finalBundles);
    rmSync(stagingDir, { recursive: true, force: true });

    process.stdout.write(`\nWrote ${finalLatest}\n`);
    process.stdout.write(`${JSON.stringify(report.metrics, null, 2)}\n`);
  } finally {
    serverSamplingStop = true;
    await killProcessTree(server);
  }
}

function osCpus() {
  return cpus().length;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
