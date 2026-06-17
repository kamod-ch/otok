import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../bin/create-otok.mjs");

test("scaffolds an app from the packaged template", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-otok-"));
  const target = path.join(tempDir, "my-app");

  try {
    const result = spawnSync(process.execPath, [cliPath, target], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Created my-app with the minimal template\./);
    assert.ok(fs.existsSync(path.join(target, "package.json")));
    assert.ok(fs.existsSync(path.join(target, "src", "server.ts")));
    assert.ok(fs.existsSync(path.join(target, "src", "client.ts")));
    assert.ok(fs.existsSync(path.join(target, "vite.config.ts")));

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    assert.equal(pkg.name, "my-app");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
