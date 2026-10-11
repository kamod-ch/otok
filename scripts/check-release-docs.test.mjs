#!/usr/bin/env node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { test } from "node:test";
import { runReleaseDocsCheck } from "./check-release-docs.mjs";

function writeMinimalGoodTree(root) {
  writeFileSync(join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@12.5.1+sha512.test" }, null, 2));
  mkdirSync(join(root, "packages/otok"), { recursive: true });
  writeFileSync(join(root, "packages/otok/package.json"), JSON.stringify({ version: "2.0.0" }, null, 2));
  mkdirSync(join(root, "docs/2.0"), { recursive: true });
  writeFileSync(join(root, "docs/2.0/status.md"), "# status\n");
  writeFileSync(join(root, "docs/2.0/migration.md"), "# migration\n");
  mkdirSync(join(root, "apps/docs/content/project"), { recursive: true });
  const statusLink = "[status](./docs/2.0/status.md)";
  writeFileSync(join(root, "README.md"), `# Otok\n\n2.0.0 repo line. See ${statusLink}.\n`);
  writeFileSync(
    join(root, "CONTRIBUTING.md"),
    `# Contributing\n\nUse pnpm 12 — see packageManager in package.json.\n${statusLink}\n`,
  );
  writeFileSync(join(root, "docs/node-support.md"), `# Node\n${statusLink}\n`);
  writeFileSync(
    join(root, "apps/docs/content/project/roadmap.md"),
    `# Roadmap\n\nConfig-time plugins live in otok-config.\n${statusLink}\n`,
  );
}

test("passes on a minimal consistent tree", () => {
  const root = mkdtempSync(join(tmpdir(), "otok-release-docs-ok-"));
  writeMinimalGoodTree(root);
  const problems = runReleaseDocsCheck({ root, throwOnly: true, quiet: true });
  assert.deepEqual(problems, []);
  rmSync(root, { recursive: true, force: true });
});

test("fails when README still claims pre-1.0", () => {
  const root = mkdtempSync(join(tmpdir(), "otok-release-docs-pre-"));
  writeMinimalGoodTree(root);
  writeFileSync(join(root, "README.md"), "Otok is currently pre-1.0.\n");
  const problems = runReleaseDocsCheck({ root, throwOnly: true, quiet: true });
  assert.ok(problems.some((p) => /pre-1\.0/.test(p)));
  rmSync(root, { recursive: true, force: true });
});

test("fails when CONTRIBUTING references the wrong pnpm major", () => {
  const root = mkdtempSync(join(tmpdir(), "otok-release-docs-pnpm-"));
  writeMinimalGoodTree(root);
  writeFileSync(join(root, "CONTRIBUTING.md"), "Use pnpm 10 only.\n");
  const problems = runReleaseDocsCheck({ root, throwOnly: true, quiet: true });
  assert.ok(problems.some((p) => /pnpm/.test(p)));
  rmSync(root, { recursive: true, force: true });
});

test("historical stabilization log is not scanned", () => {
  const root = mkdtempSync(join(tmpdir(), "otok-release-docs-hist-"));
  writeMinimalGoodTree(root);
  mkdirSync(join(root, "docs/stabilization"), { recursive: true });
  writeFileSync(join(root, "docs/stabilization/status.md"), "Legacy pre-1.0 evidence.\n");
  const problems = runReleaseDocsCheck({ root, throwOnly: true, quiet: true });
  assert.deepEqual(problems, []);
  rmSync(root, { recursive: true, force: true });
});
