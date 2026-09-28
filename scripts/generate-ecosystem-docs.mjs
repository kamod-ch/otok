#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.env.OTOK_ECOSYSTEM_CATALOG_PATH ?? path.join(repoRoot, "docs/ecosystem-catalog.json");
const outputPath =
  process.env.OTOK_ECOSYSTEM_OUTPUT_PATH ?? path.join(repoRoot, "apps/docs/content/guides/ecosystem.md");
const packagesDir = path.join(repoRoot, "packages");

const CATEGORIES = ["core", "adapter", "extension", "kit", "preset", "tooling", "migration", "contract"];
const INTEGRATIONS = ["core", "plugin", "composition", "adapter", "scaffold", "cli", "testing"];
const AUDIENCES = ["application", "extension-author", "maintainer"];

/** Docs targets plan 015 will add; allowed before the file exists. */
const PLANNED_DOCS_TARGETS = new Set([
  "packages/otok-adapter-contract/README.md",
  "packages/otok-kit-content/README.md",
  "packages/otok-kit-marketplace/README.md",
  "packages/otok-plugin-fixture/README.md",
  "packages/otok-search/README.md",
  "packages/otok-preset-crm/README.md",
  "packages/otok-preset-dashboard/README.md",
  "packages/otok-preset-kamod/README.md",
  "packages/otok-preset-minimal/README.md",
  "packages/otok-preset-saas/README.md",
]);

function loadPublishablePackages() {
  const dirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((dir) => fs.existsSync(path.join(packagesDir, dir, "package.json")));

  const packages = new Map();
  for (const dir of dirs) {
    const manifestPath = path.join(packagesDir, dir, "package.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.private === true || manifest.publishConfig?.access !== "public") continue;
    packages.set(manifest.name, { dir, manifest });
  }
  return packages;
}

function loadCatalog() {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Missing catalog file: ${path.relative(repoRoot, catalogPath)}`);
  }
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function assertDocsTarget(target) {
  const absolute = path.join(repoRoot, target);
  if (fs.existsSync(absolute)) return;
  if (PLANNED_DOCS_TARGETS.has(target)) return;
  throw new Error(`Catalog docs target missing: ${target}`);
}

export function validateCatalog(catalog, publishable) {
  const errors = [];
  if (!catalog?.entries || !Array.isArray(catalog.entries)) {
    throw new Error("Catalog must contain an entries array.");
  }

  const seenPackages = new Set();
  const seenDirs = new Set();

  for (const entry of catalog.entries) {
    const label = entry.package ?? entry.directory ?? "(unknown entry)";

    if (!entry.package || !entry.directory) {
      errors.push(`${label}: package and directory are required.`);
      continue;
    }
    if (seenPackages.has(entry.package)) errors.push(`Duplicate catalog package: ${entry.package}`);
    if (seenDirs.has(entry.directory)) errors.push(`Duplicate catalog directory: ${entry.directory}`);
    seenPackages.add(entry.package);
    seenDirs.add(entry.directory);

    if (!CATEGORIES.includes(entry.category)) {
      errors.push(`${entry.package}: invalid category "${entry.category}".`);
    }
    if (!AUDIENCES.includes(entry.audience)) {
      errors.push(`${entry.package}: invalid audience "${entry.audience}".`);
    }
    if (!Array.isArray(entry.integration) || entry.integration.length === 0) {
      errors.push(`${entry.package}: integration must be a non-empty array.`);
    } else {
      for (const mode of entry.integration) {
        if (!INTEGRATIONS.includes(mode)) {
          errors.push(`${entry.package}: invalid integration "${mode}".`);
        }
      }
    }
    if (typeof entry.summary !== "string" || !entry.summary.trim()) {
      errors.push(`${entry.package}: summary is required.`);
    }
    if (typeof entry.featured !== "boolean") {
      errors.push(`${entry.package}: featured must be a boolean.`);
    }
    if (typeof entry.docs !== "string" || !entry.docs.trim()) {
      errors.push(`${entry.package}: docs target is required.`);
    } else {
      try {
        assertDocsTarget(entry.docs);
      } catch (error) {
        errors.push(`${entry.package}: ${error.message}`);
      }
    }

    const manifest = publishable.get(entry.package);
    if (!manifest) {
      errors.push(`Catalog entry without publishable manifest: ${entry.package}`);
    } else if (manifest.dir !== entry.directory) {
      errors.push(`${entry.package}: directory mismatch (catalog ${entry.directory}, manifest ${manifest.dir}).`);
    }
  }

  for (const [name, { dir }] of publishable) {
    if (!seenPackages.has(name)) {
      errors.push(`Publishable package missing from catalog: ${name} (${dir})`);
    }
  }

  const order = [...CATEGORIES];
  const sorted = [...catalog.entries].sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.package.localeCompare(b.package),
  );
  for (let i = 0; i < catalog.entries.length; i++) {
    const a = catalog.entries[i];
    const b = sorted[i];
    if (a.package !== b.package) {
      errors.push("Catalog entries must be sorted by category, then package name.");
      break;
    }
  }

  if (errors.length > 0) {
    console.error("Ecosystem catalog validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function renderEcosystemMarkdown(catalog, publishable) {
  const byCategory = new Map();
  for (const entry of catalog.entries) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category).push(entry);
  }

  const lines = [
    "---",
    "title: Ecosystem catalog",
    "section: Guides",
    "order: 5",
    "---",
    "",
    "# Ecosystem catalog",
    "",
    "Machine-generated inventory of every published Otok package. Versions come from package manifests at generation time.",
    "",
    "> Regenerate with `pnpm docs:ecosystem:generate`. Source: [`docs/ecosystem-catalog.json`](../../../docs/ecosystem-catalog.json).",
    "",
  ];

  for (const category of CATEGORIES) {
    const entries = byCategory.get(category);
    if (!entries?.length) continue;

    lines.push(`## ${category.charAt(0).toUpperCase()}${category.slice(1)}`, "");

    const sortedEntries = [...entries].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.package.localeCompare(b.package);
    });

    lines.push(
      "| Package | Version | Integration | Audience | Summary | Docs |",
      "| --- | --- | --- | --- | --- | --- |",
    );

    for (const entry of sortedEntries) {
      const version = publishable.get(entry.package).manifest.version;
      const integration = entry.integration.map((mode) => `\`${mode}\``).join(", ");
      let docCell = entry.docs;
      if (entry.docs.startsWith("apps/docs/content/guides/")) {
        const base = path.basename(entry.docs, ".md");
        docCell = `[${base}](./${base}.md)`;
      } else if (entry.docs === "apps/docs/content/index.md") {
        docCell = "[Overview](../index.md)";
      } else if (entry.docs.startsWith("apps/docs/content/")) {
        docCell = `[docs](${entry.docs.replace("apps/docs/content/", "../")})`;
      } else if (entry.docs.startsWith("packages/")) {
        docCell = `[package docs](https://github.com/kamod-ch/otok/tree/main/${entry.docs})`;
      } else {
        docCell = `\`${entry.docs}\``;
      }
      lines.push(
        `| \`${entry.package}\` | ${version} | ${integration} | ${entry.audience} | ${entry.summary} | ${docCell} |`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const checkMode = process.argv.includes("--check");
  const publishable = loadPublishablePackages();
  const catalog = loadCatalog();

  if (!validateCatalog(catalog, publishable)) return;

  const rendered = renderEcosystemMarkdown(catalog, publishable);

  if (!fs.existsSync(outputPath)) {
    if (checkMode) {
      console.error(
        `Missing generated docs output: ${path.relative(repoRoot, outputPath)} (run pnpm docs:ecosystem:generate).`,
      );
      process.exitCode = 1;
      return;
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, rendered);
    console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
    return;
  }

  const existing = fs.readFileSync(outputPath, "utf8");
  if (existing !== rendered) {
    if (checkMode) {
      console.error(
        `Generated docs are out of date: ${path.relative(repoRoot, outputPath)} (run pnpm docs:ecosystem:generate).`,
      );
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(outputPath, rendered);
    console.log(`Updated ${path.relative(repoRoot, outputPath)}`);
    return;
  }

  if (checkMode) {
    console.log("Ecosystem catalog and generated docs are up to date.");
  } else {
    console.log(`No changes to ${path.relative(repoRoot, outputPath)}`);
  }
}

main();
