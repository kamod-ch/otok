#!/usr/bin/env node
/**
 * Validates benchmark metrics and bundle entry gzip budgets.
 * Missing required measurements fail the gate (no silent skip).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const budgetsPath = process.env.OTOK_BUDGETS_PATH ?? join(root, "benchmarks/budgets.json");
const resultsPath = process.env.OTOK_BENCHMARK_RESULTS_PATH ?? join(root, "benchmarks/results/latest.json");
const bundlesPath = process.env.OTOK_BUNDLE_RESULTS_PATH ?? join(root, "benchmarks/results/bundles.json");

if (!existsSync(budgetsPath)) {
  console.error("Missing benchmarks/budgets.json");
  process.exit(1);
}

const budgets = JSON.parse(readFileSync(budgetsPath, "utf8"));
const errors = [];
const warnings = [];
const tolerance = budgets.tolerancePercent ?? 5;

function checkLimit(label, actual, limit) {
  if (actual === undefined || actual === null) {
    errors.push(`${label}: missing measurement`);
    return;
  }
  const spec = typeof limit === "number" ? { max: limit } : limit;
  const max = spec.max;
  const min = spec.min;
  if (max !== undefined && actual > max * (1 + tolerance / 100)) {
    errors.push(`${label}: ${actual} exceeds budget ${max} (+${tolerance}% tolerance)`);
  } else if (max !== undefined && actual > max) {
    warnings.push(`${label}: ${actual} slightly exceeds budget ${max} (within noise band)`);
  }
  if (min !== undefined && actual < min * (1 - tolerance / 100)) {
    warnings.push(`${label}: ${actual} below minimum ${min} (investigate)`);
  }
}

if (!existsSync(resultsPath)) {
  errors.push(`Missing benchmark results at ${resultsPath} — run pnpm bench:otok`);
} else {
  const results = JSON.parse(readFileSync(resultsPath, "utf8"));
  const required = budgets.requiredMetrics ?? Object.keys(budgets.metrics ?? {});

  let metrics = { ...results.metrics };
  if (existsSync(bundlesPath)) {
    const bundles = JSON.parse(readFileSync(bundlesPath, "utf8"));
    if (metrics.clientJsKb == null && bundles.aggregates?.clientJsGzipKb != null) {
      metrics.clientJsKb = bundles.aggregates.clientJsGzipKb;
    }
  }

  for (const metric of required) {
    const limit = budgets.metrics?.[metric];
    if (!limit) {
      errors.push(`Budget spec missing metric definition for "${metric}"`);
      continue;
    }
    const optionalEnv = budgets.optionalUnlessEnv?.[metric];
    if (optionalEnv && !process.env[optionalEnv]) continue;
    checkLimit(metric, metrics?.[metric], limit);
  }
}

if (!existsSync(bundlesPath)) {
  errors.push(`Missing bundle measurements at ${bundlesPath} — run pnpm budget:measure`);
} else {
  const bundles = JSON.parse(readFileSync(bundlesPath, "utf8"));
  if (budgets.aggregates?.clientJsGzipKb) {
    checkLimit("clientJsGzipKb", bundles.aggregates?.clientJsGzipKb, budgets.aggregates.clientJsGzipKb);
  }
  for (const [entry, limit] of Object.entries(budgets.bundleEntries ?? {})) {
    const gzipBytes = bundles.entries?.[entry]?.gzipBytes;
    const gzipKb = gzipBytes == null ? undefined : Math.round((gzipBytes / 1024) * 10) / 10;
    checkLimit(`bundle:${entry}`, gzipKb, limit);
  }
}

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

console.log("✓ Budget check passed");
