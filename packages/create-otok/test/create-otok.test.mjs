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
  const runtime = readJson(path.join(repoRoot, "packages/otok/package.json"));
  const plugin = readJson(path.join(repoRoot, "packages/vite-plugin-otok/package.json"));
  return {
    otok: `^${runtime.version}`,
    plugin: `^${plugin.version}`,
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

test("scaffolds an app from the packaged minimal template", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "my-app");

    const result = spawnSync(process.execPath, [cliPath, target], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created my-app with the minimal template\./);
    assert.ok(fs.existsSync(path.join(target, "package.json")));
    assert.ok(fs.existsSync(path.join(target, "src", "server.ts")));
    assert.ok(fs.existsSync(path.join(target, "src", "client.ts")));
    assert.ok(fs.existsSync(path.join(target, "vite.config.ts")));

    const pkg = readJson(path.join(target, "package.json"));
    const versions = expectedPackageVersions();
    assert.equal(pkg.name, "my-app");
    assert.equal(pkg.dependencies.otok, versions.otok);
    assert.equal(pkg.devDependencies["@otok/vite-plugin"], versions.plugin);
  });
});

test("scaffolds an app from the packaged full template", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "full-app");

    const result = spawnSync(process.execPath, [cliPath, target, "--template", "full"], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created full-app with the full template\./);

    const pkg = readJson(path.join(target, "package.json"));
    const versions = expectedPackageVersions();
    assert.equal(pkg.name, "full-app");
    assert.equal(pkg.dependencies.otok, versions.otok);
    assert.equal(pkg.devDependencies["@otok/vite-plugin"], versions.plugin);
  });
});

test("rejects invalid package names before copying files", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "Bad Name");

    const result = spawnSync(process.execPath, [cliPath, target], {
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid package name "Bad Name"/);
    assert.equal(fs.existsSync(target), false);
  });
});

test("rejects uppercase package names before copying files", () => {
  withTempDir((tempDir) => {
    const target = path.join(tempDir, "MyApp");

    const result = spawnSync(process.execPath, [cliPath, target], {
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid package name "MyApp"/);
    assert.equal(fs.existsSync(target), false);
  });
});
