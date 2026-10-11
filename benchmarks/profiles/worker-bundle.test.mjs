import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { summarizeBundleDirectory } from "../../examples/deployment/cloudflare/scripts/bundle-measure.mjs";

test("summarizeBundleDirectory sums worker modules and excludes assets/", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-worker-bundle-"));
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "worker.js"), "x".repeat(100));
  writeFileSync(join(dir, "chunk.mjs"), "y".repeat(50));
  writeFileSync(join(dir, "assets", "client.js"), "z".repeat(1000));
  const summary = summarizeBundleDirectory(dir);
  assert.equal(summary.rawBytes, 150);
  assert.equal(summary.moduleCount, 2);
  assert.ok(summary.gzipBytes > 0);
  rmSync(dir, { recursive: true, force: true });
});

test("summarizeBundleDirectory fails on missing directory", () => {
  assert.throws(() => summarizeBundleDirectory("/nonexistent/path"), /missing/);
});
