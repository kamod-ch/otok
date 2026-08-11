#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const exampleName = "deployment/cloudflare";

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit", cwd: options.cwd ?? repoRoot, env: process.env });
}

function findPack(dir, prefix) {
  const match = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".tgz"))
    .sort()
    .find((name) => {
      const rest = name.slice(prefix.length);
      return /^\d/.test(rest);
    });
  if (!match) throw new Error(`Missing pack matching ${prefix}<version>.tgz in ${dir}`);
  return path.join(dir, match);
}

const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-cf-packs-"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-cf-example-"));

try {
  run("pnpm -r --filter './packages/*' build");
  run(`pnpm --filter otok pack --pack-destination ${JSON.stringify(packDir)}`);
  run(`pnpm --filter @kamod-ch/otok-vite-plugin pack --pack-destination ${JSON.stringify(packDir)}`);
  run(`pnpm --filter @kamod-ch/otok-config pack --pack-destination ${JSON.stringify(packDir)}`);
  run(`pnpm --filter @kamod-ch/otok-route-typegen pack --pack-destination ${JSON.stringify(packDir)}`);

  const otokPack = findPack(packDir, "otok-");
  const pluginPack = findPack(packDir, "kamod-ch-otok-vite-plugin-");
  const configPack = findPack(packDir, "kamod-ch-otok-config-");
  const routeTypegenPack = findPack(packDir, "kamod-ch-otok-route-typegen-");

  const source = path.join(repoRoot, "examples", exampleName);
  const exampleDir = path.join(workDir, "cloudflare");
  fs.cpSync(source, exampleDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== "node_modules" && base !== "dist" && base !== ".wrangler";
    },
  });

  const packageJsonPath = path.join(exampleDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  for (const [name, script] of Object.entries(packageJson.scripts ?? {})) {
    packageJson.scripts[name] = script.replace(/\bpnpm run\b/g, "npm run");
  }
  packageJson.dependencies = {
    ...packageJson.dependencies,
    otok: `file:${otokPack}`,
    "@kamod-ch/otok-vite-plugin": `file:${pluginPack}`,
    "@kamod-ch/otok-config": `file:${configPack}`,
    "@kamod-ch/otok-route-typegen": `file:${routeTypegenPack}`,
  };
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  run("npm install --no-fund --no-audit --legacy-peer-deps", { cwd: exampleDir });
  run("npm run typecheck", { cwd: exampleDir });
  run("npm run build", { cwd: exampleDir });
  run("npx wrangler deploy --dry-run", { cwd: exampleDir });

  console.log("\nCloudflare example typechecked, built, and wrangler dry-run succeeded.");
} finally {
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.rmSync(workDir, { recursive: true, force: true });
}
