#!/usr/bin/env node
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractMarkdownLinks,
  isExternalLink,
  resolveLocalMarkdownTarget,
  checkRoadmapPlannedLabels,
} from "./check-docs.mjs";
import { getCatalogValidationErrors } from "./generate-ecosystem-docs.mjs";

test("stripFencedCode removes fenced blocks before link extraction", () => {
  const md = "See [ok](./a.md).\n```md\n[ignore](./missing.md)\n```\n";
  assert.deepEqual(extractMarkdownLinks(md), ["./a.md"]);
});

test("isExternalLink skips http and mailto", () => {
  assert.equal(isExternalLink("https://example.com"), true);
  assert.equal(isExternalLink("./local.md"), false);
});

test("resolveLocalMarkdownTarget strips anchors", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-docs-link-"));
  const from = join(dir, "docs/a.md");
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(from, "# A");
  writeFileSync(join(dir, "docs/b.md"), "# B");
  const resolved = resolveLocalMarkdownTarget(from, "./b.md#section", dir);
  assert.equal(resolved.outsideRepo, false);
  assert.ok(resolved.absolute.endsWith("b.md"));
  rmSync(dir, { recursive: true, force: true });
});

test("extractMarkdownLinks reports missing local targets in fixture repo", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-docs-missing-"));
  writeFileSync(join(dir, "README.md"), "[x](./nope.md)\n");
  const from = join(dir, "README.md");
  const target = resolveLocalMarkdownTarget(from, "./nope.md", dir);
  assert.equal(target.outsideRepo, false);
  assert.equal(existsSync(target.absolute), false);
  rmSync(dir, { recursive: true, force: true });
});

test("getCatalogValidationErrors detects duplicate packages", () => {
  const errors = getCatalogValidationErrors(
    {
      entries: [
        {
          package: "@kamod-ch/otok",
          directory: "otok",
          category: "core",
          integration: ["core"],
          audience: "application",
          summary: "Core",
          docs: "apps/docs/content/index.md",
          featured: true,
        },
        {
          package: "@kamod-ch/otok",
          directory: "otok",
          category: "core",
          integration: ["core"],
          audience: "application",
          summary: "Dup",
          docs: "apps/docs/content/index.md",
          featured: false,
        },
      ],
    },
    new Map([["@kamod-ch/otok", { dir: "otok", manifest: { name: "@kamod-ch/otok", version: "1.0.0" } }]]),
  );
  assert.ok(errors.some((e) => /Duplicate catalog package/.test(e)));
});

test("checkRoadmapPlannedLabels flags implemented package marked Planned", () => {
  const dir = mkdtempSync(join(tmpdir(), "otok-docs-roadmap-"));
  mkdirSync(join(dir, "docs"), { recursive: true });
  mkdirSync(join(dir, "packages/otok-search"), { recursive: true });
  writeFileSync(
    join(dir, "packages/otok-search/package.json"),
    JSON.stringify({ name: "@kamod-ch/otok-search", publishConfig: { access: "public" } }),
  );
  writeFileSync(join(dir, "docs/ecosystem-extensions.md"), "| otok-search | Planned |\n");
  const errors = checkRoadmapPlannedLabels(dir);
  assert.ok(errors.length > 0);
  rmSync(dir, { recursive: true, force: true });
});
