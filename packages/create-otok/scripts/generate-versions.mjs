#!/usr/bin/env node
/**
 * Generates packages/create-otok/versions.json from workspace package versions.
 * Run from repo root: node packages/create-otok/scripts/generate-versions.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createOtokRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(createOtokRoot, "../..");

function readVersion(relativePath) {
  const pkgPath = path.join(repoRoot, relativePath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version;
}

function caret(version) {
  return `^${version}`;
}

const matrix = {
  generatedAt: new Date().toISOString(),
  otok: caret(readVersion("packages/otok")),
  "@otok/vite-plugin": caret(readVersion("packages/vite-plugin-otok")),
  "@otok/config": caret(readVersion("packages/otok-config")),
  "@kamod-ch/otok-kamod": "^1.0.0",
  "@kamod-ch/otok-auth": "^1.1.0",
  "@kamod-ch/otok-i18n": "^2.0.0",
  "@kamod-ch/otok-kysely": "^1.0.0",
  "@kamod-ch/otok-validation": "^1.0.0",
  "@kamod-ch/otok-security": "^1.0.0",
  "@kamod-ch/otok-seo": "^1.0.0",
  "@kamod-ui/core": "^0.1.5",
  "@kamod-ch/ui": "^1.1.0",
  "@kamod-ch/icons": "^1.0.0",
  "otok-adapter-node": "^1.0.0",
  "otok-adapter-cloudflare": "^1.0.0",
  "otok-adapter-static": "^1.0.0",
  hono: "^4.12.25",
  preact: "^10.28.2",
  "@hono/node-server": "^2.0.1",
  "@preact/preset-vite": "^2.10.5",
  "@hono/vite-dev-server": "^0.21.0",
  typescript: "~6.0.2",
  vite: "^8.0.10",
  vitest: "^4.1.2",
  kysely: "^0.28.2",
  zod: "^3.24.0",
  "better-sqlite3": "^11.10.0",
  pg: "^8.16.0",
};

const outPath = path.join(createOtokRoot, "versions.json");
fs.writeFileSync(outPath, `${JSON.stringify(matrix, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
