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
  "@kamod-ch/otok": caret(readVersion("packages/otok")),
  "@kamod-ch/otok-vite-plugin": caret(readVersion("packages/vite-plugin-otok")),
  "@kamod-ch/otok-config": caret(readVersion("packages/otok-config")),
  "@kamod-ch/otok-kamod": caret(readVersion("packages/otok-kamod")),
  "@kamod-ch/otok-auth": caret(readVersion("packages/otok-auth")),
  "@kamod-ch/otok-i18n": caret(readVersion("packages/otok-i18n")),
  "@kamod-ch/otok-kysely": caret(readVersion("packages/otok-kysely")),
  "@kamod-ch/otok-validation": caret(readVersion("packages/otok-validation")),
  "@kamod-ch/otok-security": caret(readVersion("packages/otok-security")),
  "@kamod-ch/otok-seo": caret(readVersion("packages/otok-seo")),
  "@kamod-ui/core": "^0.1.5",
  "@kamod-ch/ui": "^1.1.0",
  "@kamod-ch/icons": "^1.0.0",
  "otok-adapter-node": caret(readVersion("packages/otok-adapter-node")),
  "otok-adapter-cloudflare": caret(readVersion("packages/otok-adapter-cloudflare")),
  "otok-adapter-static": caret(readVersion("packages/otok-adapter-static")),
  hono: "^4.13.8",
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
