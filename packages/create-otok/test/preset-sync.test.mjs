#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, "../..");

function normalizeExtends(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).slice().sort();
}

function snapshot(preset) {
  return {
    name: preset.name,
    starter: preset.starter ?? null,
    otok: preset.otok ?? null,
    extends: normalizeExtends(preset.extends),
    packageJson: {
      dependencies: preset.packageJson?.dependencies ?? {},
      devDependencies: preset.packageJson?.devDependencies ?? {},
      scripts: preset.packageJson?.scripts ?? {},
    },
  };
}

const publishedPackages = [
  "@kamod-ch/otok-preset-minimal",
  "@kamod-ch/otok-preset-kamod",
  "@kamod-ch/otok-preset-dashboard",
  "@kamod-ch/otok-preset-saas",
  "@kamod-ch/otok-preset-crm",
];

test("published otok-preset-* packages match create-otok registry", async () => {
  const { presetRegistry } = await import(pathToFileURL(path.join(__dirname, "../dist/registry.js")).href);

  for (const name of publishedPackages) {
    const registryPreset = presetRegistry[name];
    assert.ok(registryPreset, `registry missing ${name}`);

    const folder = name.replace("@kamod-ch/", "");
    const distEntry = path.join(packagesDir, folder, "dist/index.js");
    const srcEntry = path.join(packagesDir, folder, "src/index.ts");
    const entry = fs.existsSync(distEntry) ? distEntry : srcEntry;
    assert.ok(fs.existsSync(entry), `preset package missing ${entry}`);

    const mod = await import(pathToFileURL(entry).href);
    const published = mod.default;
    assert.deepEqual(snapshot(published), snapshot(registryPreset), `drift: ${name}`);
  }
});
