#!/usr/bin/env node
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
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
    tolerancePercent: 0,
    requiredMetrics: ["productionBuildMs"],
    metrics: { productionBuildMs: { max: 100 } },
    aggregates: { clientJsGzipKb: { max: 10 } },
  };
  writeFileSync(join(dir, "budgets.json"), JSON.stringify(budgets));
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify({ metrics: { productionBuildMs: 500, peakRssMb: 1, clientJsKb: 1 } }),
  );
  writeFileSync(join(dir, "bundles.json"), JSON.stringify({ aggregates: { clientJsGzipKb: 99 }, entries: {} }));
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
    tolerancePercent: 0,
    requiredMetrics: [],
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
  assert.match(r.stderr + r.stdout, /missing measurement/);
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
  writeFileSync(join(dir, "packages/demo/package.json"), JSON.stringify({ name: "@test/pkg", exports: { ".": "./dist/index.d.ts" } }));
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
