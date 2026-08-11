#!/usr/bin/env node
/**
 * Compare PreactPress docs template build vs Otok preactpress-migration example.
 * Usage: node scripts/benchmark-preactpress-migration.mjs [--output path]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const otokRoot = path.resolve(__dirname, "..");
const preactpressRoot = path.resolve(otokRoot, "../preactpress");
const otokExample = path.join(otokRoot, "examples/preactpress-migration");
const ppDocsTemplate = path.join(preactpressRoot, "templates/docs");
const defaultOutput = path.join(otokRoot, "benchmarks/preactpress-migration/results.json");

function parseArgs(argv) {
  const args = { output: defaultOutput };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
  }
  return args;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function dirSizeBytes(root) {
  let total = 0;
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.isFile()) total += (await fs.stat(full)).size;
    }
  }
  if (await pathExists(root)) await walk(root);
  return total;
}

async function countHtmlPages(distDir) {
  let count = 0;
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.name === "index.html" || ent.name.endsWith(".html")) count += 1;
    }
  }
  if (await pathExists(distDir)) await walk(distDir);
  return count;
}

async function fileSize(p) {
  try {
    return (await fs.stat(p)).size;
  } catch {
    return 0;
  }
}

async function analyzeHtmlAssets(distDir, sampleRoute) {
  const htmlPath = path.join(distDir, sampleRoute.replace(/^\//, ""), "index.html");
  const htmlBytes = await fileSize(htmlPath);
  let mainJsBytes = 0;
  let scriptTags = 0;

  if (htmlBytes > 0) {
    const html = await fs.readFile(htmlPath, "utf8");
    const scriptMatches = html.match(/<script[^>]+src="([^"]+)"/g) ?? [];
    scriptTags = scriptMatches.length;
    for (const match of scriptMatches) {
      const href = match.match(/src="([^"]+)"/)?.[1];
      if (href && !href.startsWith("http")) {
        const assetPath = href.startsWith("/")
          ? path.join(distDir, href.replace(/^\//, ""))
          : path.join(path.dirname(htmlPath), href);
        mainJsBytes += await fileSize(assetPath);
      }
    }
  }

  return { htmlBytes, mainJsBytes, scriptTags };
}

async function runCommand(cwd, command, args) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("close", (code) => {
      const durationMs = Math.round(performance.now() - start);
      if (code !== 0) reject(new Error(`${command} exited ${code}`));
      else resolve(durationMs);
    });
  });
}

async function benchmarkPreactPress() {
  if (!(await pathExists(preactpressRoot))) {
    return { skipped: true, reason: "preactpress repo not found at ../preactpress" };
  }
  if (!(await pathExists(path.join(preactpressRoot, "dist/node/index.js")))) {
    await runCommand(preactpressRoot, "pnpm", ["run", "build"]);
  }

  const distDir = path.join(ppDocsTemplate, "dist");
  await fs.rm(distDir, { recursive: true, force: true });

  const start = performance.now();
  const previousCwd = process.cwd();
  process.chdir(ppDocsTemplate);
  try {
    const { build } = await import(path.join(preactpressRoot, "dist/node/index.js"));
    await build(".");
  } finally {
    process.chdir(previousCwd);
  }
  const buildTimeMs = Math.round(performance.now() - start);

  const searchIndexPath = path.join(distDir, "preactpress-search.json");
  const assets = await analyzeHtmlAssets(distDir, "/docs/getting-started");

  return {
    engine: "preactpress",
    fixture: "templates/docs",
    buildTimeMs,
    totalStaticBytes: await dirSizeBytes(distDir),
    pageCount: await countHtmlPages(distDir),
    searchIndexBytes: await fileSize(searchIndexPath),
    sampleRoute: "/guide/getting-started",
    ...assets,
    lighthouseProxy: {
      note: "Static HTML/JS size proxy — run Lighthouse separately for full scores",
      htmlBytes: assets.htmlBytes,
      mainJsBytes: assets.mainJsBytes,
    },
  };
}

async function benchmarkOtok() {
  if (!(await pathExists(otokExample))) {
    return { skipped: true, reason: "otok example not found" };
  }

  const distDir = path.join(otokExample, "dist");
  await fs.rm(distDir, { recursive: true, force: true });

  const buildTimeMs = await runCommand(otokRoot, "pnpm", [
    "--filter",
    "preactpress-migration",
    "build",
  ]);

  const assets = await analyzeHtmlAssets(distDir, "/docs/getting-started");

  return {
    engine: "otok",
    fixture: "examples/preactpress-migration",
    buildTimeMs,
    totalStaticBytes: await dirSizeBytes(distDir),
    pageCount: await countHtmlPages(distDir),
    searchIndexBytes: 0,
    sampleRoute: "/docs/getting-started",
    ...assets,
    lighthouseProxy: {
      note: "Static HTML/JS size proxy — run Lighthouse separately for full scores",
      htmlBytes: assets.htmlBytes,
      mainJsBytes: assets.mainJsBytes,
    },
  };
}

const args = parseArgs(process.argv.slice(2));

const results = {
  generatedAt: new Date().toISOString(),
  preactpress: await benchmarkPreactPress(),
  otok: await benchmarkOtok(),
  comparison: {},
};

if (!results.preactpress.skipped && !results.otok.skipped) {
  results.comparison = {
    buildTimeDeltaMs: results.otok.buildTimeMs - results.preactpress.buildTimeMs,
    totalStaticBytesDelta: results.otok.totalStaticBytes - results.preactpress.totalStaticBytes,
    pageCountDelta: results.otok.pageCount - results.preactpress.pageCount,
    mainJsBytesDelta: results.otok.mainJsBytes - results.preactpress.mainJsBytes,
  };
}

await fs.mkdir(path.dirname(args.output), { recursive: true });
await fs.writeFile(args.output, `${JSON.stringify(results, null, 2)}\n`);
console.log(`\nWrote ${args.output}`);
