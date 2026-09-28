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

const PLANNED_DOCS_TARGETS = new Set();

const CATEGORY_INTRO = {
  core: "Framework runtime, config resolution, and the Vite plugin.",
  adapter: "Deployment targets configured in `otok.config.ts`. See [Ecosystem — adapters](./ecosystem-adapters.md).",
  extension: "Optional capabilities — register as plugins, import explicitly, or both.",
  kit: "Composable business layers merged at scaffold or runtime. See [Kits and presets](./ecosystem-kits-and-presets.md).",
  preset:
    "Scaffold-time bundles selected with `create otok --variant`. See [Kits and presets](./ecosystem-kits-and-presets.md).",
  tooling: "CLI, registry, scaffolds, and test helpers for authors and maintainers.",
  migration: "Compatibility shims for migrating existing apps.",
  contract: "Contributor-facing contracts and fixtures — not recommended application dependencies.",
};

function loadRegistryAliases() {
  const registryPath = path.join(repoRoot, "packages/otok-registry/registry/v1/extensions.json");
  const aliases = new Map();
  if (!fs.existsSync(registryPath)) return aliases;
  const bundle = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  for (const ext of bundle.extensions ?? []) {
    const primary = ext.aliases?.[0];
    if (primary) aliases.set(ext.name, primary);
  }
  return aliases;
}

function installHint(entry, registryAliases) {
  if (entry.audience === "maintainer" || entry.category === "contract") {
    return "— (contributor)";
  }
  if (entry.category === "preset") {
    const variant = entry.directory.replace(/^otok-preset-/, "");
    return `\`pnpm create otok@latest my-app --variant ${variant}\``;
  }
  if (entry.category === "adapter") {
    return `\`pnpm add ${entry.package}\``;
  }
  if (entry.package === "create-otok") {
    return `\`pnpm create otok@latest my-app\``;
  }
  if (entry.package === "@kamod-ch/otok") {
    return "included in scaffold";
  }
  if (entry.integration.includes("plugin") && registryAliases.has(entry.package)) {
    return `\`pnpm otok add ${registryAliases.get(entry.package)}\``;
  }
  if (entry.category === "kit") {
    return "scaffold / `mergeKits`";
  }
  if (entry.integration.includes("composition") || entry.category === "extension") {
    return `\`pnpm add ${entry.package}\``;
  }
  return "—";
}

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

function renderDocLink(entry) {
  if (entry.docs.startsWith("apps/docs/content/guides/")) {
    const base = path.basename(entry.docs, ".md");
    return `[${base}](./${base}.md)`;
  }
  if (entry.docs === "apps/docs/content/index.md") {
    return "[Overview](../index.md)";
  }
  if (entry.docs.startsWith("apps/docs/content/")) {
    return `[docs](${entry.docs.replace("apps/docs/content/", "../")})`;
  }
  if (entry.docs.startsWith("packages/")) {
    return `[README](https://github.com/kamod-ch/otok/tree/main/${entry.docs})`;
  }
  return `\`${entry.docs}\``;
}

function renderEcosystemMarkdown(catalog, publishable) {
  const byCategory = new Map();
  for (const entry of catalog.entries) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category).push(entry);
  }

  const registryAliases = loadRegistryAliases();

  const lines = [
    "---",
    "title: Ecosystem catalog",
    "section: Guides",
    "order: 5",
    "---",
    "",
    "# Ecosystem catalog",
    "",
    "Complete inventory of every published Otok package. Versions are read from package manifests when this page is generated.",
    "",
    "> Regenerate with `pnpm docs:ecosystem:generate`. Source: [`docs/ecosystem-catalog.json`](https://github.com/kamod-ch/otok/blob/main/docs/ecosystem-catalog.json).",
    "",
    "## Taxonomy",
    "",
    "| Kind | Meaning |",
    "| --- | --- |",
    "| **Core** | Framework runtime and Vite integration. |",
    "| **Adapter** | Deployment target wired in `otok.config.ts`. |",
    "| **Plugin** | Registers through `otok.config.ts` / plugin hooks (`integration` includes `plugin`). |",
    "| **Composition** | Imported and wired explicitly by the application. |",
    "| **Kit** | Composable business/application layer. |",
    "| **Preset** | Scaffold-time selection via `create otok --variant`. |",
    "| **Tooling / testing** | CLI, registry, scaffolds, and test helpers. |",
    "| **Contract / fixture** | Extension-author or maintainer packages — not app recommendations. |",
    "",
    "Curated guides: [Data and platform](./ecosystem-data-and-platform.md) · [Auth and security](./ecosystem-auth-and-security.md) · [Content and product](./ecosystem-content-and-product.md) · [AI and operations](./ecosystem-ai-and-operations.md) · [Kits and presets](./ecosystem-kits-and-presets.md) · [Adapters](./ecosystem-adapters.md).",
    "",
    "## How to add capabilities",
    "",
    "1. **Presets** — `pnpm create otok@latest my-app --variant <name>` (see [Kits and presets](./ecosystem-kits-and-presets.md)).",
    "2. **Registry plugins** — `pnpm otok add <alias>` for official extensions in the registry (see [CLI — otok add](./cli-add.md)).",
    "3. **Composition packages** — `pnpm add <package>` and wire imports in server routes, loaders, or `configure`.",
    "4. **Adapters** — install an adapter package and set `adapter` in `otok.config.ts` (see [Deployment adapters](./adapters.md)).",
    "",
    "Not every package is a plugin. Check the **Integration** column below.",
    "",
  ];

  for (const category of CATEGORIES) {
    const entries = byCategory.get(category);
    if (!entries?.length) continue;

    const title = category.charAt(0).toUpperCase() + category.slice(1);
    lines.push(`## ${title}`, "", CATEGORY_INTRO[category] ?? "", "");

    if (category === "contract") {
      lines.push("*Contributor-only — do not add these as casual application dependencies.*", "");
    }

    const sortedEntries = [...entries].sort((a, b) => {
      const aContributor = a.audience !== "application" ? 1 : 0;
      const bContributor = b.audience !== "application" ? 1 : 0;
      if (aContributor !== bContributor) return aContributor - bContributor;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.package.localeCompare(b.package);
    });

    lines.push(
      "| Package | Version | Integration | Audience | Install | Summary | Docs |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );

    for (const entry of sortedEntries) {
      const version = publishable.get(entry.package).manifest.version;
      const integration = entry.integration.map((mode) => `\`${mode}\``).join(", ");
      const audience = entry.audience === "application" ? entry.audience : `**${entry.audience}**`;
      const install = installHint(entry, registryAliases);
      lines.push(
        `| \`${entry.package}\` | ${version} | ${integration} | ${audience} | ${install} | ${entry.summary} | ${renderDocLink(entry)} |`,
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
