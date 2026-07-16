#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const examples = ["reference-ai-audit", "reference-flat-cms"];

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

function copyExample(name, destRoot) {
  const source = path.join(repoRoot, "examples", name);
  const dest = path.join(destRoot, name);
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== "node_modules" && base !== "dist";
    },
  });
  return dest;
}

const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-packs-"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-examples-"));

try {
  run("pnpm -r --filter './packages/*' build");
  run(`pnpm --filter otok pack --pack-destination ${JSON.stringify(packDir)}`);
  run(`pnpm --filter @otok/vite-plugin pack --pack-destination ${JSON.stringify(packDir)}`);

  const otokPack = findPack(packDir, "otok-");
  const pluginPack = findPack(packDir, "otok-vite-plugin-");

  for (const example of examples) {
    const exampleDir = copyExample(example, workDir);
    const packageJsonPath = path.join(exampleDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJson.dependencies = {
      ...packageJson.dependencies,
      otok: `file:${otokPack}`,
      "@otok/vite-plugin": `file:${pluginPack}`,
    };
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

    run("npm install --no-fund --no-audit", { cwd: exampleDir });
    run("npx tsc -p tsconfig.json --noEmit", { cwd: exampleDir });
    run("npm run build", { cwd: exampleDir });
  }

  console.log("\nAll reference examples typechecked and built successfully.");
} finally {
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.rmSync(workDir, { recursive: true, force: true });
}
