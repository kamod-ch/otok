#!/usr/bin/env node
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { test } from "node:test";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptsDir, "..");

function runScript(script, env = {}) {
  return spawnSync(process.execPath, [join(scriptsDir, script)], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

test("check-api-stability fails on unlisted export", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-api-"));
  const manifest = {
    packages: {
      "@kamod-ch/otok-config": { exports: { ".": "public" } },
    },
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
  const r = runScript("check-api-stability.mjs", {
    OTOK_API_STABILITY_PATH: join(dir, "manifest.json"),
    OTOK_GOVERNANCE_PACKAGES_DIR: join(root, "scripts/fixtures/gates/extra-export/packages"),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /not listed in api-stability/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets fails when results missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-budget-"));
  const budgets = {
    tolerancePercent: 5,
    requiredMetrics: ["productionBuildMs"],
    metrics: { productionBuildMs: { max: 1 } },
  };
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  const missingResults = join(dir, "missing.json");
  const r = runScript("check-budgets.mjs", {
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: missingResults,
    OTOK_BUNDLE_RESULTS_PATH: missingResults,
    OTOK_GATES_STRICT: "1",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /Missing benchmark results/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets fails on controlled overshoot", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-budget-over-"));
  const budgets = {
    version: "2.0.0",
    tolerancePercent: 0,
    profiles: {
      production: {
        requiredMetrics: ["productionBuildMs", "clientJsGzipKiB"],
        requiredScenarios: [],
        scenarioMetrics: [],
        routeMetrics: [],
      },
    },
    metrics: { productionBuildMs: { max: 100 } },
    aggregates: { clientJsGzipKiB: { max: 10 } },
  };
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({
      runId: "run-a",
      metrics: { productionBuildMs: 500, buildPeakRssMb: 1, serverPeakRssMb: 1, clientJsGzipKiB: 1 },
      scenarios: {
        home: { ssrLatencyP50Ms: 1, ssrLatencyP95Ms: 1, ssrThroughputRps: 100, requestErrors: 0, initialJsGzipKiB: 1 },
        about: { ssrLatencyP50Ms: 1, ssrLatencyP95Ms: 1, ssrThroughputRps: 100, requestErrors: 0, initialJsGzipKiB: 0 },
      },
    }),
  );
  writeFileSync(
    join(dir, "bundles.json"),
    JSON.stringify({
      runId: "run-a",
      aggregates: { clientJsGzipKiB: 99 },
      routes: { home: { initialJsGzipKiB: 1 }, about: { initialJsGzipKiB: 0 } },
      entries: {},
    }),
  );
  const r = runScript("check-budgets.mjs", {
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
    OTOK_BUNDLE_RESULTS_PATH: join(dir, "bundles.json"),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /exceeds budget/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets fails when bundle entry measurement missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-bundle-entry-"));
  const budgets = {
    version: "2.0.0",
    tolerancePercent: 0,
    profiles: {
      production: {
        requiredMetrics: [],
        requiredScenarios: [],
        scenarioMetrics: [],
        routeMetrics: [],
      },
    },
    metrics: {},
    bundleEntries: { "server/server.js": { max: 100 } },
  };
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(join(dir, "latest.json"), JSON.stringify({ metrics: {} }));
  writeFileSync(join(dir, "bundles.json"), JSON.stringify({ aggregates: {}, entries: {} }));
  const r = runScript("check-budgets.mjs", {
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
    OTOK_BUNDLE_RESULTS_PATH: join(dir, "bundles.json"),
    OTOK_GATES_STRICT: "1",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /bundle:server\/server\.js: missing/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets rejects non-numeric measurements", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-budget-type-"));
  const budgets = JSON.parse(readFileSync(join(root, "benchmarks/budgets.json"), "utf8"));
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({
      runId: "x",
      metrics: {
        productionBuildMs: "slow",
        buildPeakRssMb: 1,
        serverPeakRssMb: 1,
        clientJsGzipKiB: 1,
      },
      scenarios: {
        home: { ssrLatencyP50Ms: 1, ssrLatencyP95Ms: 1, ssrThroughputRps: 10, requestErrors: 0 },
        about: { ssrLatencyP50Ms: 1, ssrLatencyP95Ms: 1, ssrThroughputRps: 10, requestErrors: 0, initialJsGzipKiB: 0 },
      },
    }),
  );
  writeFileSync(
    join(dir, "bundles.json"),
    JSON.stringify({ runId: "x", aggregates: { clientJsGzipKiB: 1 }, routes: {}, entries: {} }),
  );
  const r = runScript("check-budgets.mjs", {
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
    OTOK_BUNDLE_RESULTS_PATH: join(dir, "bundles.json"),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /invalid type/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-api-snapshot fails on removed export", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-snap-"));
  mkdirSync(join(dir, "pkg"), { recursive: true });
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ packages: { "@test/pkg": { exports: { ".": "public" } } } }),
  );
  writeFileSync(
    join(dir, "snapshot.json"),
    JSON.stringify({
      packages: {
        "@test/pkg": { ".": { classification: "public", exports: ["RemovedSymbol"] } },
      },
    }),
  );
  mkdirSync(join(dir, "packages/demo/dist"), { recursive: true });
  writeFileSync(
    join(dir, "packages/demo/package.json"),
    JSON.stringify({ name: "@test/pkg", exports: { ".": "./dist/index.d.ts" } }),
  );
  writeFileSync(join(dir, "packages/demo/dist/index.d.ts"), "export declare function StillHere(): void;\n");
  const r = spawnSync(process.execPath, [join(scriptsDir, "check-api-snapshot.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      OTOK_API_STABILITY_PATH: join(dir, "manifest.json"),
      OTOK_API_SNAPSHOT_PATH: join(dir, "snapshot.json"),
      OTOK_GOVERNANCE_PACKAGES_DIR: join(dir, "packages"),
    },
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets fails when dev-start profile metrics missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-dev-start-"));
  const budgets = JSON.parse(readFileSync(join(root, "benchmarks/budgets.json"), "utf8"));
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({ profile: "dev-start", metrics: { devServerColdStartP50Ms: null } }),
  );
  const r = runScript("check-budgets.mjs", {
    BENCH_PROFILE: "dev-start",
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
    OTOK_BUNDLE_RESULTS_PATH: join(dir, "bundles.json"),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /missing|invalid/i);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets rejects profile mismatch", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-profile-mismatch-"));
  const budgets = JSON.parse(readFileSync(join(root, "benchmarks/budgets.json"), "utf8"));
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({
      profile: "worker-bundle",
      metrics: { edgeBundleUploadKiB: 10, edgeBundleUploadGzipKiB: 5, edgeBundleModuleCount: 1 },
    }),
  );
  const r = runScript("check-budgets.mjs", {
    BENCH_PROFILE: "dev-start",
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /does not match/);
  rmSync(dir, { recursive: true, force: true });
});

test("check-budgets passes worker-bundle fixture within budgets", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-gate-worker-bundle-"));
  const budgets = JSON.parse(readFileSync(join(root, "benchmarks/budgets.json"), "utf8"));
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({
      profile: "worker-bundle",
      metrics: { edgeBundleUploadKiB: 100, edgeBundleUploadGzipKiB: 40, edgeBundleModuleCount: 2 },
    }),
  );
  const r = runScript("check-budgets.mjs", {
    BENCH_PROFILE: "worker-bundle",
    OTOK_BUDGETS_PATH: join(dir, "budgets.json"),
    OTOK_BENCHMARK_RESULTS_PATH: join(dir, "latest.json"),
  });
  assert.equal(r.status, 0);
  rmSync(dir, { recursive: true, force: true });
});
