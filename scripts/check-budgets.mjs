#!/usr/bin/env node
/**
 * Validates benchmark metrics, scenario gates, and bundle budgets.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const budgetsPath = process.env.OTOK_BUDGETS_PATH ?? join(root, "benchmarks/budgets.json");
const resultsPath = process.env.OTOK_BENCHMARK_RESULTS_PATH ?? join(root, "benchmarks/results/latest.json");
const bundlesPath = process.env.OTOK_BUNDLE_RESULTS_PATH ?? join(root, "benchmarks/results/bundles.json");
const profileName = process.env.BENCH_PROFILE ?? "production";

if (!existsSync(budgetsPath)) {
  console.error("Missing benchmarks/budgets.json");
  process.exit(1);
}

const budgets = JSON.parse(readFileSync(budgetsPath, "utf8"));
const errors = [];
const warnings = [];
const tolerance = budgets.tolerancePercent ?? 5;

function asMetricNumber(value, label) {
  if (value === null || value === undefined) return { ok: false, reason: `${label}: missing` };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, reason: `${label}: invalid type (${typeof value})` };
  }
  return { ok: true, value };
}

function checkBound(label, actual, spec, options = {}) {
  const informational = options.informational ?? spec.informational ?? false;
  const parsed = asMetricNumber(actual, label);
  if (!parsed.ok) {
    errors.push(`${label}: ${parsed.reason}`);
    return;
  }
  const value = parsed.value;
  if (spec.exact !== undefined) {
    if (value !== spec.exact) errors.push(`${label}: ${value} must equal ${spec.exact}`);
    return;
  }
  if (spec.max !== undefined) {
    const hard = spec.max * (1 + tolerance / 100);
    if (value > hard) {
      const msg = `${label}: ${value} exceeds budget ${spec.max} (+${tolerance}% tolerance)`;
      if (informational) warnings.push(`${msg} (informational)`);
      else errors.push(msg);
    } else if (value > spec.max) warnings.push(`${label}: ${value} slightly exceeds budget ${spec.max} (within noise band)`);
  }
  if (spec.min !== undefined) {
    const hard = spec.min * (1 - tolerance / 100);
    if (value < hard) {
      const msg = `${label}: ${value} below minimum ${spec.min} (-${tolerance}% tolerance)`;
      if (informational) warnings.push(`${msg} (informational)`);
      else errors.push(msg);
    } else if (value < spec.min) warnings.push(`${label}: ${value} slightly below minimum ${spec.min} (within noise band)`);
  }
}

function checkMetricKey(metric, limit, optionalEnv) {
  if (!limit) {
    errors.push(`Budget spec missing metric definition for "${metric}"`);
    return;
  }
  if (optionalEnv && process.env[optionalEnv] && !process.env.OTOK_BENCH_SELF_HOSTED) {
    // legacy external URL mode — optionalUnlessEnv only when not self-hosted runner
  }
  return limit;
}

const profile = budgets.profiles?.[profileName];
if (!profile) {
  errors.push(`Unknown BENCH_PROFILE "${profileName}"`);
}

const requiresBundles =
  profile?.requiresBundles ?? (profileName === "production" || profileName === "navigation");

let results;
let bundles;
if (!existsSync(resultsPath)) {
  errors.push(`Missing benchmark results at ${resultsPath} — run pnpm bench:otok`);
} else {
  results = JSON.parse(readFileSync(resultsPath, "utf8"));
}

if (requiresBundles) {
  if (!existsSync(bundlesPath)) {
    errors.push(`Missing bundle measurements at ${bundlesPath} — run pnpm budget:measure`);
  } else {
    bundles = JSON.parse(readFileSync(bundlesPath, "utf8"));
  }
}

if (results && bundles) {
  if (results.runId && bundles.runId && results.runId !== bundles.runId) {
    errors.push(`Run ID mismatch: results=${results.runId} bundles=${bundles.runId}`);
  }
  if (
    results.artifactHash &&
    bundles.artifactHash &&
    results.artifactHash !== bundles.artifactHash
  ) {
    errors.push(`Artifact hash mismatch between results and bundles`);
  }
}

if (results && profile) {
  if (results.profile && results.profile !== profileName) {
    errors.push(`Results profile "${results.profile}" does not match BENCH_PROFILE="${profileName}"`);
  }
  const metrics = results.metrics ?? {};
  const informationalSet = new Set(profile.informationalMetrics ?? []);
  for (const metric of profile.requiredMetrics ?? []) {
    const limit = budgets.metrics?.[metric] ?? budgets.aggregates?.[metric];
    checkMetricKey(metric, limit);
    const value = metrics[metric] ?? (metric === "clientJsGzipKiB" ? bundles?.aggregates?.clientJsGzipKiB : undefined);
    checkBound(metric, value, limit ?? {}, { informational: informationalSet.has(metric) });
  }
  for (const metric of profile.informationalMetrics ?? []) {
    if (profile.requiredMetrics?.includes(metric)) continue;
    const limit = budgets.metrics?.[metric];
    if (!limit) continue;
    checkBound(metric, metrics[metric], limit, { informational: true });
  }

  for (const scenarioKey of profile.requiredScenarios ?? []) {
    const scenarioSpec = budgets.scenarios?.[scenarioKey];
    const measured = results.scenarios?.[scenarioKey];
    if (!scenarioSpec) {
      errors.push(`Missing scenario definition for "${scenarioKey}"`);
      continue;
    }
    if (!measured) {
      errors.push(`scenario:${scenarioKey}: missing measurements`);
      continue;
    }
    for (const field of profile.scenarioMetrics ?? []) {
      checkBound(`scenario:${scenarioKey}:${field}`, measured[field], scenarioSpec[field] ?? budgets.metrics?.[field]);
    }
    for (const field of profile.routeMetrics ?? []) {
      const routeValue = measured[field] ?? bundles?.routes?.[scenarioKey]?.[field];
      checkBound(`route:${scenarioKey}:${field}`, routeValue, scenarioSpec[field]);
    }
  }

  if (profileName === "navigation") {
    const nav = results.navigation ?? {};
    for (const metric of profile.requiredMetrics ?? []) {
      checkBound(metric, nav[metric], budgets.metrics?.[metric] ?? { max: 0 });
    }
  }

  // Legacy optionalUnlessEnv when BENCH_URL set without self-hosted results
  if (process.env.BENCH_URL && !results.scenarios) {
    for (const [metric, envKey] of Object.entries(budgets.legacyOptionalUnlessEnv ?? {})) {
      if (process.env[envKey]) {
        checkBound(metric, metrics[metric], budgets.metrics?.[metric]);
      }
    }
  }
}

if (bundles && requiresBundles) {
  if (budgets.aggregates?.clientJsGzipKiB) {
    checkBound("clientJsGzipKiB", bundles.aggregates?.clientJsGzipKiB, budgets.aggregates.clientJsGzipKiB);
  }
  for (const [entry, limit] of Object.entries(budgets.bundleEntries ?? {})) {
    const gzipBytes = bundles.entries?.[entry]?.gzipBytes;
    const gzipKiB = gzipBytes == null ? undefined : gzipBytes / 1024;
    if (gzipKiB == null) {
      errors.push(`bundle:${entry}: missing measurement`);
      continue;
    }
    checkBound(`bundle:${entry}`, gzipKiB, limit);
  }
}

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

console.log(`✓ Budget check passed (profile=${profileName})`);
