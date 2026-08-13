#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const cliPath = path.resolve(__dirname, "../bin/create-otok.mjs");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function expectedPackageVersions() {
  const matrix = readJson(path.join(__dirname, "../versions.json"));
  return {
    otok: matrix["@kamod-ch/otok"],
    plugin: matrix["@kamod-ch/otok-vite-plugin"],
  };
}

function withTempDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-otok-"));
  try {
    return fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: "utf8" });
}

test("scaffolds an app from the packaged minimal template", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "my-app");
    const result = runCli([target, "--yes", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created my-app \(minimal\)/);
    assert.ok(fs.existsSync(path.join(target, "package.json")));

    const pkg = readJson(path.join(target, "package.json"));
    const versions = expectedPackageVersions();
    assert.equal(pkg.name, "my-app");
    assert.equal(pkg.dependencies["@kamod-ch/otok"], versions.otok);
    assert.equal(pkg.devDependencies["@kamod-ch/otok-vite-plugin"], versions.plugin);
  });
});

test("optionally generates ai.json support", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "ai-app");
    const result = runCli([target, "--yes", "--ai-json", "true", "--testing", "true", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    assert.ok(fs.existsSync(path.join(target, "ai.json")));
    assert.ok(fs.existsSync(path.join(target, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(target, "docs/architecture.md")));

    const manifest = readJson(path.join(target, "ai.json"));
    assert.deepEqual(Object.keys(manifest).sort(), [
      "$schema",
      "commands",
      "context",
      "permissions",
      "project",
      "quality",
      "version",
    ]);
    assert.equal(manifest.$schema, "https://ai-json.org/schema/v1.json");
    assert.equal(manifest.version, 1);
    assert.deepEqual(manifest.project, { name: "ai-app", type: "web-app" });
    assert.equal(manifest.commands.dev, "pnpm dev");
    assert.equal(manifest.commands.build, "pnpm build");
    assert.equal(manifest.commands.test, "pnpm test");
    assert.equal(manifest.commands.typecheck, "pnpm typecheck");
    assert.equal(manifest.context.agents, "AGENTS.md");
    assert.equal(manifest.context.architecture, "docs/architecture.md");
    assert.equal(manifest.context.docs, "docs/");
    assert.equal(manifest.context.source, "src/");
    assert.deepEqual(manifest.permissions, { filesystem: "workspace", network: false });
    assert.ok(manifest.quality.required.every((gate) => manifest.commands[gate]));
  });
});

test("scaffolds kamod variant non-interactively", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "kamod-app");
    const result = runCli([target, "--yes", "--variant", "kamod", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(path.join(target, "otok.config.ts")));
    const config = fs.readFileSync(path.join(target, "otok.config.ts"), "utf8");
    assert.match(config, /@kamod-ch\/otok-kamod/);
  });
});

test("legacy --template full maps to dashboard", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "full-app");
    const result = runCli([target, "--yes", "--template", "dashboard", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created full-app \(dashboard\)/);
  });
});

test("rejects invalid package names", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "Bad Name");
    const result = runCli([target, "--yes"], tempDir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid package name/i);
  });
});

test("rejects non-empty directories without --force", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "existing");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "keep.txt"), "x");
    const result = runCli([target, "--yes", "--no-install"], tempDir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not empty/i);
  });
});

test("--force scaffolds into non-empty directory", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "existing");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "keep.txt"), "x");
    const result = runCli([target, "--yes", "--force", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(path.join(target, "src/server.ts")));
  });
});

test("scaffolds crm variant with kit files and manifest", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "crm-app");
    const result = runCli([target, "--yes", "--variant", "crm", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created crm-app \(crm\)/);
    assert.match(result.stdout, /@kamod-ch\/otok-kit-crm/);

    assert.ok(fs.existsSync(path.join(target, "src/app/routes/crm/index.tsx")), "crm index route");
    assert.ok(fs.existsSync(path.join(target, "src/app/data/crm-runtime.ts")), "crm runtime");
    assert.ok(fs.existsSync(path.join(target, "src/app/routes/crm/pipelines.tsx")), "pipelines module");
    assert.ok(fs.existsSync(path.join(target, ".otok/kit-manifest.json")), "kit manifest");

    const manifest = readJson(path.join(target, ".otok/kit-manifest.json"));
    assert.ok(manifest.kits.includes("@kamod-ch/otok-kit-crm"));
    assert.ok(manifest.files.some((f) => f.includes("crm/index.tsx")));

    const pkg = readJson(path.join(target, "package.json"));
    assert.ok(pkg.dependencies["@kamod-ch/otok-kit-crm"]);
  });
});

test("--dry-run crm includes kit in plan", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "crm-dry");
    const result = runCli([target, "--yes", "--variant", "crm", "--dry-run", "--no-install"], tempDir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /@kamod-ch\/otok-kit-crm/);
    assert.equal(fs.existsSync(target), false);
  });
});
