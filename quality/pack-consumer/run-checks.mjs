#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const errors = [];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: here, stdio: "pipe", encoding: "utf8" });
  if (r.status !== 0) errors.push(`${cmd} ${args.join(" ")}:\n${r.stderr || r.stdout}`);
}

if (!existsSync(join(here, "node_modules/@kamod-ch/otok"))) {
  errors.push("node_modules/@kamod-ch/otok missing — install packed tarballs first");
} else {
  run("node", ["--input-type=module", "-e", "import('@kamod-ch/otok/server'); import('@kamod-ch/otok/client'); console.log('imports ok');"]);
  run("node", [
    "--input-type=module",
    "-e",
    "import { readFileSync } from 'node:fs'; const p='node_modules/@kamod-ch/otok/package.json'; const j=JSON.parse(readFileSync(p,'utf8')); if(!j.exports?.['./server']) throw new Error('packed otok missing ./server export');",
  ]);
  run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"]);
  run("node", [
    "--input-type=module",
    "-e",
    "import { build } from 'esbuild'; import { writeFileSync } from 'node:fs'; writeFileSync('browser-entry.mjs', \"import { createElement } from 'preact'; import { Island } from '@kamod-ch/otok/client'; export const x = () => createElement(Island, { name: 'x' });\"); await build({ entryPoints: ['browser-entry.mjs'], bundle: true, format: 'esm', platform: 'browser', outfile: 'dist/browser-bundle.js', external: [] });",
  ]);
  const viteClientTypes = join(here, "node_modules/@kamod-ch/otok-vite-plugin/client.d.ts");
  if (!existsSync(viteClientTypes)) {
    errors.push("packed @kamod-ch/otok-vite-plugin missing client.d.ts (./client types export)");
  }
}

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exit(1);
}
console.log("✓ Pack consumer checks passed");
