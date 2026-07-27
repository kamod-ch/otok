#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_ALIASES = {
  minimal: "otok-starter-minimal",
  full: "otok-starter-dashboard",
  kamod: "otok-starter-kamod",
  saas: "otok-starter-saas",
  dashboard: "otok-starter-dashboard",
};

function usage() {
  console.log(`create-otok

Usage:
  pnpm create otok <app-name> [--template minimal|kamod|dashboard|saas]

Templates:
  minimal     Small counter demo without UI libraries (otok-starter-minimal)
  kamod       Kamod UI + Tailwind via @kamod-ch/otok-kamod
  dashboard   Dashboard playground with Kamod components
  saas        Auth, i18n, Kysely, validation, security, SEO, and CRUD demo

Legacy aliases: --template full → dashboard

Options:
  --help, -h    Show this help message
`);
}

function resolveTemplateDir(template) {
  const resolved = TEMPLATE_ALIASES[template];
  if (!resolved) {
    throw new Error(
      `Unknown template "${template}". Expected one of: ${Object.keys(TEMPLATE_ALIASES).filter((key) => key !== "full").join(", ")}.`,
    );
  }

  const candidates = [
    path.resolve(__dirname, `../${resolved}`),
    ...(template === "full" || template === "dashboard"
      ? [path.resolve(__dirname, "../template"), path.resolve(__dirname, "../../../templates/default")]
      : []),
    ...(template === "minimal" ? [path.resolve(__dirname, "../template-minimal")] : []),
  ];

  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!found) {
    throw new Error(`Could not locate template "${template}" (${resolved}).`);
  }
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

function isValidPackageName(name) {
  if (!name || name.length > 214) return false;
  if (name === "." || name === "..") return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  return /^[a-z0-9][a-z0-9._-]*$/.test(name);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

let name;
let template = "minimal";
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--template") {
    template = args[index + 1];
    index += 1;
  } else if (!name) {
    name = arg;
  } else {
    console.error(`Unexpected argument: ${arg}`);
    usage();
    process.exit(1);
  }
}

if (!name) {
  usage();
  process.exit(1);
}

const target = path.resolve(process.cwd(), name);
const packageName = path.basename(target);
if (!isValidPackageName(packageName)) {
  console.error(`Invalid package name "${packageName}". Use a lowercase npm-compatible name such as "my-app".`);
  process.exit(1);
}

if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`Target directory is not empty: ${target}`);
  process.exit(1);
}

copyDir(resolveTemplateDir(template), target);
updatePackageName(target, packageName);

const displayTemplate = TEMPLATE_ALIASES[template] ?? template;

console.log(`Created ${packageName} with the ${displayTemplate} template.

Next steps:
  cd ${path.relative(process.cwd(), target) || "."}
  pnpm install
  pnpm dev
`);
