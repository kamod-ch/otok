#!/usr/bin/env node
/**
 * Compares benchmark results against budgets.json thresholds.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const budgetsPath = join(root, "benchmarks/budgets.json");
const resultsPath = join(root, "benchmarks/results/latest.json");

if (!existsSync(budgetsPath)) {
  console.error("Missing benchmarks/budgets.json");
  process.exit(1);
}

const budgets = JSON.parse(readFileSync(budgetsPath, "utf8"));

if (!existsSync(resultsPath)) {
  console.warn("No benchmark results at benchmarks/results/latest.json — skipping budget check.");
  console.warn("Run: pnpm bench:otok");
  process.exit(0);
}

const results = JSON.parse(readFileSync(resultsPath, "utf8"));
const errors = [];
const warnings = [];
const tolerance = budgets.tolerancePercent ?? 5;

for (const [metric, limit] of Object.entries(budgets.metrics)) {
  const actual = results.metrics?.[metric];
  if (actual === undefined) {
    warnings.push(`Metric "${metric}" not measured`);
    continue;
  }

  const spec = typeof limit === "number" ? { max: limit } : limit;
  const max = spec.max;
  const min = spec.min;

  if (max !== undefined && actual > max * (1 + tolerance / 100)) {
    errors.push(`${metric}: ${actual} exceeds budget ${max} (+${tolerance}% tolerance)`);
  } else if (max !== undefined && actual > max) {
    warnings.push(`${metric}: ${actual} slightly exceeds budget ${max}`);
  }

  if (min !== undefined && actual < min * (1 - tolerance / 100)) {
    warnings.push(`${metric}: ${actual} below minimum ${min} (investigate)`);
  }
}

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

console.log("✓ Budget check passed");
