#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalogValidationErrors, loadPublishablePackages } from "./generate-ecosystem-docs.mjs";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)]+)\)/g;
const ROADMAP_FILES = ["docs/ecosystem-extensions.md", "docs/extension-roadmap.md"];

export function stripFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/~~~[\s\S]*?~~~/g, "");
}

export function isExternalLink(target) {
  const trimmed = target.trim();
  return (
    /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || trimmed.startsWith("//") || trimmed.startsWith("#")
  );
}

export function extractMarkdownLinks(markdown) {
  const body = stripFencedCode(markdown);
  const links = [];
  for (const match of body.matchAll(MARKDOWN_LINK)) {
    links.push(match[2].trim());
  }
  return links;
}

export function resolveLocalMarkdownTarget(fromFile, target, repoRoot) {
  if (isExternalLink(target)) return null;
  const raw = target.split("#")[0].split("?")[0].trim();
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const absolute = path.resolve(path.dirname(fromFile), decoded);
  if (!absolute.startsWith(repoRoot)) {
    return { absolute, outsideRepo: true };
  }
  return { absolute, outsideRepo: false };
}

export function localLinkExists(resolved) {
  if (!resolved || resolved.outsideRepo) return true;
  return fs.existsSync(resolved.absolute);
}

export function collectMarkdownFiles(repoRoot) {
  const files = [
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "CONTRIBUTING.md"),
    path.join(repoRoot, "SECURITY.md"),
  ].filter((file) => fs.existsSync(file));

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) files.push(full);
    }
  }

  walk(path.join(repoRoot, "docs"));
  walk(path.join(repoRoot, "apps/docs/content"));

  for (const dir of fs.readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const readme = path.join(repoRoot, "packages", dir.name, "README.md");
    if (fs.existsSync(readme)) files.push(readme);
  }

  return files;
}

export function checkLocalMarkdownLinks(repoRoot = defaultRepoRoot) {
  const errors = [];
  for (const file of collectMarkdownFiles(repoRoot)) {
    const markdown = fs.readFileSync(file, "utf8");
    for (const target of extractMarkdownLinks(markdown)) {
      const resolved = resolveLocalMarkdownTarget(file, target, repoRoot);
      if (resolved === null) continue;
      if (resolved.outsideRepo) continue;
      if (!localLinkExists(resolved)) {
        errors.push(
          `Broken link in ${path.relative(repoRoot, file)}: ${target} → missing ${path.relative(repoRoot, resolved.absolute)}`,
        );
      }
    }
  }
  return errors;
}

export function checkPackageReadmes(publishable, repoRoot = defaultRepoRoot) {
  const errors = [];
  for (const [, { dir, manifest }] of publishable) {
    const readme = path.join(repoRoot, "packages", dir, "README.md");
    if (!fs.existsSync(readme)) {
      errors.push(`Missing README for publishable package ${manifest.name} (${dir})`);
    }
  }
  return errors;
}

export function checkCatalog(repoRoot = defaultRepoRoot) {
  const catalogPath = path.join(repoRoot, "docs/ecosystem-catalog.json");
  if (!fs.existsSync(catalogPath)) {
    return [`Missing catalog: docs/ecosystem-catalog.json`];
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const publishable = loadPublishablePackages();
  // loadPublishablePackages uses repoRoot from generate script — ensure same root
  if (repoRoot !== defaultRepoRoot) {
    return ["Catalog check requires default repo layout (use from repository root)."];
  }
  return getCatalogValidationErrors(catalog, publishable).map((message) => `Catalog: ${message}`);
}

function registryNameToDirectory(name) {
  if (!name.startsWith("@kamod-ch/")) return name;
  return name.slice("@kamod-ch/".length);
}

function satisfiesGte(version, range) {
  const match = range.match(/^>=\s*(\d+\.\d+\.\d+)/);
  if (!match) return false;
  const normalize = (v) => v.split(".").map(Number);
  const ver = normalize(version.replace(/^v/, ""));
  const min = normalize(match[1]);
  for (let i = 0; i < 3; i++) {
    const diff = (ver[i] ?? 0) - (min[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}

export function checkRegistryMetadata(repoRoot = defaultRepoRoot) {
  const errors = [];
  const registryPath = path.join(repoRoot, "packages/otok-registry/registry/v1/extensions.json");
  const corePath = path.join(repoRoot, "packages/otok/package.json");
  if (!fs.existsSync(registryPath) || !fs.existsSync(corePath)) {
    return ["Registry or core manifest missing."];
  }
  const bundle = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const coreVersion = JSON.parse(fs.readFileSync(corePath, "utf8")).version;
  const packagesDir = path.join(repoRoot, "packages");

  for (const entry of bundle.extensions ?? []) {
    if (entry.publisher !== "kamod-ch" || !entry.name.startsWith("@kamod-ch/")) continue;
    const dir = registryNameToDirectory(entry.name);
    const manifestPath = path.join(packagesDir, dir, "package.json");
    if (!fs.existsSync(manifestPath)) {
      errors.push(`Registry entry without manifest: ${entry.name}`);
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (entry.version !== manifest.version) {
      errors.push(`Registry version drift for ${entry.name}: registry ${entry.version}, manifest ${manifest.version}`);
    }
    if (!satisfiesGte(coreVersion, entry.otokVersion)) {
      errors.push(`Registry otokVersion ${entry.otokVersion} does not accept core ${coreVersion} for ${entry.name}`);
    }
    if (entry.docs?.startsWith("https://github.com/kamod-ch/otok/tree/main/")) {
      const local = entry.docs.slice("https://github.com/kamod-ch/otok/tree/main/".length);
      if (!fs.existsSync(path.join(repoRoot, local))) {
        errors.push(`Registry docs target missing for ${entry.name}: ${local}`);
      }
    }
  }
  return errors;
}

export function listImplementedPackageSlugs(repoRoot = defaultRepoRoot) {
  const slugs = new Set();
  const packagesDir = path.join(repoRoot, "packages");
  for (const dir of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const manifestPath = path.join(packagesDir, dir.name, "package.json");
    if (!fs.existsSync(manifestPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (pkg.private === true || pkg.publishConfig?.access !== "public") continue;
    slugs.add(dir.name);
    if (pkg.name?.startsWith("@kamod-ch/")) slugs.add(pkg.name.slice("@kamod-ch/".length));
  }
  return slugs;
}

export function checkRoadmapPlannedLabels(repoRoot = defaultRepoRoot, roadmapFiles = ROADMAP_FILES) {
  const errors = [];
  const implemented = listImplementedPackageSlugs(repoRoot);
  for (const relative of roadmapFiles) {
    const file = path.join(repoRoot, relative);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const slug of implemented) {
      if (!slug.startsWith("otok-") && !slug.startsWith("create-")) continue;
      const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const plannedRow = new RegExp(`\\|[^\\n]*${escaped}[^\\n]*\\|[^\\n]*\\bPlanned\\b`, "i");
      const plannedHeading = new RegExp(`###\\s+${escaped}[^\\n]*\\([^)]*Planned`, "i");
      if (plannedRow.test(content) || plannedHeading.test(content)) {
        errors.push(`${relative}: implemented package ${slug} is still marked Planned`);
      }
    }
  }
  return errors;
}

export function runDocsStructureCheck(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  if (repoRoot !== defaultRepoRoot && options.allowAltRoot !== true) {
    return ["Docs structure check must run from the Otok repository root."];
  }

  const publishable = loadPublishablePackages();

  return [
    ...checkLocalMarkdownLinks(repoRoot),
    ...checkPackageReadmes(publishable, repoRoot),
    ...(repoRoot === defaultRepoRoot ? checkCatalog(repoRoot) : []),
    ...(repoRoot === defaultRepoRoot ? checkRegistryMetadata(repoRoot) : []),
    ...(repoRoot === defaultRepoRoot ? checkRoadmapPlannedLabels(repoRoot) : []),
  ];
}

function main() {
  const errors = runDocsStructureCheck();
  if (errors.length > 0) {
    console.error("Documentation check failed:");
    for (const error of errors) console.error(`- ${error}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("Documentation structure check passed.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) main();
