#!/usr/bin/env node
/**
 * Measure gzip sizes for playground bundles and per-route initial JS transfer.
 */
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playgroundDist = join(root, "apps/playground/dist");
const clientRoot = join(playgroundDist, "client");
const outFile = process.env.OTOK_BUNDLE_RESULTS_PATH ?? join(root, "benchmarks/results/bundles.json");
const benchUrl = process.env.BENCH_URL;

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function walkJsFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJsFiles(p, acc);
    else if (name.endsWith(".js")) acc.push(p);
  }
  return acc;
}

function relFrom(rootDir, file) {
  return file.slice(rootDir.length + 1);
}

function artifactHash() {
  const files = walkJsFiles(clientRoot).sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(readFileSync(file));
  return hash.digest("hex").slice(0, 16);
}

function extractInitialAssetUrls(html) {
  const urls = new Set();
  const moduleScripts = html.matchAll(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/gi);
  for (const match of moduleScripts) urls.add(match[1]);
  const preloads = html.matchAll(/<link[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/gi);
  for (const match of preloads) urls.add(match[1]);
  return [...urls];
}

function resolveClientAsset(urlPath) {
  const clean = urlPath.split("?")[0];
  const relative = clean.replace(/^\//, "");
  const resolved = normalize(join(clientRoot, relative));
  if (!resolved.startsWith(clientRoot)) {
    throw new Error(`Asset escapes client root: ${urlPath}`);
  }
  if (!existsSync(resolved)) throw new Error(`Unresolved asset ${urlPath} -> ${resolved}`);
  return resolved;
}

function manifestEntryForOutputFile(manifest, outputRelative) {
  for (const entry of Object.values(manifest)) {
    if (entry?.file === outputRelative) return entry;
  }
  return null;
}

function transitiveStaticImports(entryFile, manifest) {
  const seen = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const rel = relFrom(clientRoot, file);
    const entry = manifestEntryForOutputFile(manifest, rel) ?? manifest[rel];
    const imports = entry?.imports ?? [];
    for (const impKey of imports) {
      const impFile = manifest[impKey]?.file;
      if (!impFile) continue;
      const impPath = join(clientRoot, impFile);
      if (existsSync(impPath)) queue.push(impPath);
    }
  }
  return [...seen];
}

function loadManifest() {
  const candidates = walkJsFiles(clientRoot).filter((f) => f.endsWith(".json") && f.includes("manifest"));
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // continue
    }
  }
  const viteManifest = join(clientRoot, ".vite", "manifest.json");
  if (existsSync(viteManifest)) return JSON.parse(readFileSync(viteManifest, "utf8"));
  return {};
}

async function fetchHtml(path) {
  if (!benchUrl) throw new Error("BENCH_URL required for route transfer measurement");
  const res = await fetch(`${benchUrl}${path}`, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.text();
}

function initialJsGzipKiBForHtml(html, manifest) {
  const urls = extractInitialAssetUrls(html);
  const files = new Set();
  for (const url of urls) {
    const file = resolveClientAsset(url);
    for (const dep of transitiveStaticImports(file, manifest)) files.add(dep);
  }
  let bytes = 0;
  for (const file of files) bytes += gzipSize(file);
  return { initialJsGzipKiB: bytes / 1024, assetCount: files.size, executableUrls: urls };
}

const entries = {};
for (const file of walkJsFiles(clientRoot)) {
  entries[`client/${relFrom(clientRoot, file)}`] = {
    rawBytes: statSync(file).size,
    gzipBytes: gzipSize(file),
  };
}
const serverRoot = join(playgroundDist, "server");
for (const file of walkJsFiles(serverRoot)) {
  entries[`server/${relFrom(serverRoot, file)}`] = {
    rawBytes: statSync(file).size,
    gzipBytes: gzipSize(file),
  };
}

let clientJsGzipTotal = 0;
for (const [key, v] of Object.entries(entries)) {
  if (key.startsWith("client/") && key.endsWith(".js")) clientJsGzipTotal += v.gzipBytes;
}

const manifest = loadManifest();
const routes = {};
if (benchUrl) {
  for (const [name, spec] of Object.entries({
    home: "/",
    about: "/about",
  })) {
    const html = await fetchHtml(spec);
    routes[name] = initialJsGzipKiBForHtml(html, manifest);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  runId: process.env.OTOK_BENCH_RUN_ID ?? null,
  artifactHash: artifactHash(),
  project: "apps/playground",
  unit: "kibibytes (1024 bytes) for KiB fields",
  entries,
  aggregates: {
    clientJsGzipKiB: clientJsGzipTotal / 1024,
  },
  routes,
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
console.log(`clientJsGzipKiB=${report.aggregates.clientJsGzipKiB}`);
