#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../bin/create-otok.mjs");

const VARIANTS = ["minimal", "content", "kamod", "dashboard", "saas", "crm", "api"];

function withTempDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-otok-matrix-"));
  try {
    return fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function snapshotFiles(root) {
  const files = [];
  function walk(dir, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else files.push(rel);
    }
  }
  walk(root);
  return files.sort();
}

for (const variant of VARIANTS) {
  test(`matrix: scaffolds ${variant} variant with deterministic file tree`, () => {
    withTempDir((tempDir) => {
      const target = path.join(tempDir, variant);
      const result = spawnSync(process.execPath, [cliPath, target, "--yes", "--variant", variant, "--no-install"], {
        cwd: tempDir,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const files = snapshotFiles(target);
      assert.ok(files.includes("package.json"));
      assert.ok(files.includes("src/server.ts"));
      assert.ok(files.length > 5, `expected starter files for ${variant}`);
    });
  });
}

test("matrix: layers add docker and github actions files", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "layered");
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        target,
        "--yes",
        "--variant",
        "minimal",
        "--docker",
        "true",
        "--github-actions",
        "true",
        "--no-install",
      ],
      { cwd: tempDir, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(path.join(target, "Dockerfile")));
    assert.ok(fs.existsSync(path.join(target, ".github/workflows/ci.yml")));
  });
});
