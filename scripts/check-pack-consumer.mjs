#!/usr/bin/env node
/**
 * Pack core packages and verify them from an isolated consumer (no workspace protocol).
 */
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const consumerTemplate = join(root, "quality/pack-consumer");
const packDir = mkdtempSync(join(tmpdir(), "otok-pack-consumer-"));
const workDir = mkdtempSync(join(tmpdir(), "otok-pack-consumer-app-"));

const packTargets = [
  { filter: "@kamod-ch/otok-config", name: "@kamod-ch/otok-config", prefix: "kamod-ch-otok-config-" },
  { filter: "@kamod-ch/otok", name: "@kamod-ch/otok", prefix: "kamod-ch-otok-" },
  { filter: "@kamod-ch/otok-vite-plugin", name: "@kamod-ch/otok-vite-plugin", prefix: "kamod-ch-otok-vite-plugin-" },
];

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: opts.cwd ?? root, env: opts.env ?? process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function findPack(prefix) {
  const match = readdirSync(packDir).find((f) => f.startsWith(prefix) && f.endsWith(".tgz"));
  if (!match) throw new Error(`Missing pack matching ${prefix}*.tgz in ${packDir}`);
  return join(packDir, match);
}

try {
  run("pnpm", ["-r", "--filter", "./packages/*", "build"]);
  for (const target of packTargets) {
    run("pnpm", ["--filter", target.filter, "pack", "--pack-destination", packDir]);
  }

  run("cp", ["-a", `${consumerTemplate}/.`, workDir]);
  const pkgPath = join(workDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = {
    ...pkg.dependencies,
    "@kamod-ch/otok-config": `file:${findPack(packTargets[0].prefix)}`,
    "@kamod-ch/otok": `file:${findPack(packTargets[1].prefix)}`,
    "@kamod-ch/otok-vite-plugin": `file:${findPack(packTargets[2].prefix)}`,
    preact: "^10.26.0",
    hono: "^4.12.25",
    kysely: "^0.28.0",
    "@hono/node-server": "^2.0.0",
  };
  pkg.devDependencies = {
    ...pkg.devDependencies,
    typescript: "~6.0.2",
    "@types/node": "^24.12.2",
    esbuild: "^0.25.0",
  };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  run("pnpm", ["install"], { cwd: workDir });
  run("node", ["run-checks.mjs"], { cwd: workDir });
  console.log("✓ Pack consumer gate passed");
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(workDir, { recursive: true, force: true });
}
