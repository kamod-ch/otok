#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.log(`create-otok

Usage:
  pnpm create otok <app-name>

Options:
  --help, -h    Show this help message
`);
}

function resolveTemplateDir() {
  const candidates = [
    path.resolve(__dirname, "../../../templates/default"),
    path.resolve(__dirname, "../template"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!found) throw new Error("Could not locate the Otok default template.");
  return found;
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function updatePackageName(target, name) {
  const pkgPath = path.join(target, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  fs.writeFileSync(`${pkgPath}`, `${JSON.stringify(pkg, null, 2)}\n`);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const name = args[0];
if (!name) {
  usage();
  process.exit(1);
}

const target = path.resolve(process.cwd(), name);
if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`Target directory is not empty: ${target}`);
  process.exit(1);
}

copyDir(resolveTemplateDir(), target);
updatePackageName(target, path.basename(target));

console.log(`Created ${path.basename(target)}.

Next steps:
  cd ${path.relative(process.cwd(), target) || "."}
  pnpm install
  pnpm dev
`);
