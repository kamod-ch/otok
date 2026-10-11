#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { measureLatencySeries } from "../request-metrics.mjs";
import {
  assertFiniteMetric,
  gitInfo,
  killProcessTree,
  lockSha256,
  osCpus,
  repoRoot,
  writeProfileResults,
} from "./common.mjs";

const devjobs = join(repoRoot, "examples/devjobs-reference");
const MARKER = 'data-testid="cache-marker"';
const JOBS_PATH = "/jobs";

export function assertBenchDatabaseUrl(url) {
  if (!url || typeof url !== "string") {
    throw new Error("OTOK_BENCH_DATABASE_URL is required for database profile");
  }
  if (/password|secret/i.test(url)) {
    // avoid logging — validation only
  }
  const dbMatch = url.match(/\/([^/?]+)(?:\?|$)/);
  const dbName = dbMatch?.[1] ?? "";
  if (!dbName) throw new Error("OTOK_BENCH_DATABASE_URL must include a database name");
  const allowed =
    process.env.OTOK_BENCH_DATABASE_ALLOWLIST ??
    "bench,test,_bench,_test,otok_queue_test,otok_bench";
  const tokens = allowed.split(",").map((t) => t.trim()).filter(Boolean);
  const ok = tokens.some((t) => dbName.includes(t));
  if (!ok) {
    throw new Error(
      `Database "${dbName}" is not allowlisted for benchmarks (set OTOK_BENCH_DATABASE_ALLOWLIST to override)`,
    );
  }
  return dbName;
}

export async function runDatabaseProfile() {
  const databaseUrl = process.env.OTOK_BENCH_DATABASE_URL;
  const dbName = assertBenchDatabaseUrl(databaseUrl);
  const port = Number(process.env.BENCH_DEVJOBS_PORT ?? 5190);
  const baseUrl = `http://127.0.0.1:${port}`;

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORT: String(port),
    NODE_ENV: "production",
    HOST: "127.0.0.1",
  };

  const migrate = spawnSync("pnpm", ["run", "db:migrate"], { cwd: devjobs, stdio: "inherit", env });
  if (migrate.status !== 0) throw new Error("db:migrate failed");
  const seed = spawnSync("pnpm", ["run", "db:seed"], { cwd: devjobs, stdio: "inherit", env });
  if (seed.status !== 0) throw new Error("db:seed failed");

  const build = spawnSync("pnpm", ["run", "build"], { cwd: devjobs, stdio: "inherit", env });
  if (build.status !== 0) throw new Error("devjobs-reference build failed");

  const server = spawn("node", ["dist/server/server.js"], {
    cwd: devjobs,
    env,
    detached: true,
    stdio: ["ignore", "inherit", "inherit"],
  });

  try {
    const healthDeadline = Date.now() + 60_000;
    let serverReady = false;
    while (Date.now() < healthDeadline) {
      try {
        const res = await fetch(`${baseUrl}${JOBS_PATH}`);
        if (res.status === 200) {
          const body = await res.text();
          if (body.includes(MARKER) || body.includes("Devjobs Reference")) {
            serverReady = true;
            break;
          }
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!serverReady) throw new Error("devjobs production server did not become ready");

    const coldBase = `${baseUrl}${JOBS_PATH}?page=1&_bench=`;
    const coldUrls = Array.from({ length: 5 }, () => `${coldBase}${randomUUID()}`);
    const coldTimings = [];
    let errors = 0;
    for (const url of coldUrls) {
      const t0 = performance.now();
      try {
        const res = await fetch(url, { headers: { accept: "text/html", "cache-control": "no-cache" } });
        const body = await res.text();
        if (res.status !== 200 || !body.includes(MARKER)) throw new Error(`bad response ${res.status}`);
        coldTimings.push(performance.now() - t0);
      } catch {
        errors += 1;
      }
    }

    const cachedUrl = `${baseUrl}${JOBS_PATH}?page=1`;
    const cached = await measureLatencySeries(cachedUrl, {
      warmup: 2,
      samples: 20,
      marker: MARKER,
    });

    coldTimings.sort((a, b) => a - b);
    const p50 = coldTimings[Math.floor(coldTimings.length / 2)] ?? null;
    const p95 = coldTimings[Math.min(coldTimings.length - 1, Math.ceil(coldTimings.length * 0.95) - 1)] ?? null;
    if (p50 == null || p95 == null) throw new Error("No cold DB listing samples");

    const metrics = {
      jobsListingDbColdP50Ms: assertFiniteMetric(Math.round(p50 * 100) / 100, "jobsListingDbColdP50Ms"),
      jobsListingDbColdP95Ms: assertFiniteMetric(Math.round(p95 * 100) / 100, "jobsListingDbColdP95Ms"),
      jobsListingCachedP50Ms: assertFiniteMetric(Math.round(cached.p50Ms * 100) / 100, "jobsListingCachedP50Ms"),
      jobsListingCachedP95Ms: assertFiniteMetric(Math.round(cached.p95Ms * 100) / 100, "jobsListingCachedP95Ms"),
      jobsListingRequestErrors: assertFiniteMetric(errors, "jobsListingRequestErrors"),
    };

    const { gitSha, dirty } = gitInfo();
    const report = {
      profile: "database",
      generatedAt: new Date().toISOString(),
      gitSha,
      dirty,
      lockfileSha256: lockSha256(),
      nodeVersion: process.version,
      os: { platform: process.platform, arch: process.arch, cpus: osCpus() },
      project: "examples/devjobs-reference",
      origin: "production-node-server",
      database: {
        name: dbName,
        pool: "pg via @kamod-ch/otok-kysely",
        seed: "examples/devjobs-reference seeds",
      },
      methodology: {
        path: JOBS_PATH,
        cold: "unique _bench query param per sample (bypasses SSR page cache)",
        cached: "repeated identical URL; includes SSR public cache (maxAge 120) — not raw DB latency",
        cachePolicy: "public maxAge=120 on /jobs",
      },
      metrics,
      scenarios: null,
      navigation: null,
    };

    const path = writeProfileResults(report);
    process.stdout.write(`Wrote ${path}\n${JSON.stringify(metrics, null, 2)}\n`);
  } finally {
    await killProcessTree(server);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseProfile().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
