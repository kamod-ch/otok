import assert from "node:assert/strict";
import { test } from "node:test";
import { assertFiniteMetric } from "./common.mjs";

test("assertFiniteMetric rejects invalid values", () => {
  assert.throws(() => assertFiniteMetric(-1, "x"), /finite/);
  assert.throws(() => assertFiniteMetric("1", "x"), /finite/);
  assert.equal(assertFiniteMetric(0, "x"), 0);
});

test("dev-start profile name and units are documented in budgets", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const budgets = JSON.parse(readFileSync(join(root, "budgets.json"), "utf8"));
  const profile = budgets.profiles["dev-start"];
  assert.ok(profile);
  assert.ok(profile.requiredMetrics.includes("devServerColdStartP50Ms"));
  assert.equal(budgets.metrics.devServerColdStartP50Ms.unit, "ms");
});
