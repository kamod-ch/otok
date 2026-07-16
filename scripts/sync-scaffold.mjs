#!/usr/bin/env node
// Source of truth: apps/playground. Sync shared scaffold files from there into
// templates/default and packages/create-otok/template. Playground-only files
// stay excluded here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(repoRoot, "apps/playground");
const targets = [
  path.join(repoRoot, "templates/default"),
  path.join(repoRoot, "packages/create-otok/template"),
];
const checkMode = process.argv.includes("--check");

const excludedSourceFiles = new Set(["src/smoke.test.ts", "src/app/routes/boom.tsx"]);
const templateTsconfig = `${JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      jsxImportSource: "preact",
      strict: true,
      skipLibCheck: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      noEmit: true,
      types: ["vite/client", "node"],
    },
    include: ["src", "vite.config.ts"],
  },
  null,
  2,
)}\n`;

function collectFiles(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, base));
      continue;
    }
    files.push(path.relative(base, fullPath));
  }
  return files.sort();
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : undefined;
  if (current === content) return false;
  ensureParent(filePath);
  fs.writeFileSync(filePath, content);
  return true;
}

function removeExtraneousFiles(root, allowedFiles) {
  const existing = collectFiles(root);
  for (const relativePath of existing) {
    if (allowedFiles.has(relativePath)) continue;
    fs.rmSync(path.join(root, relativePath), { force: true });
  }
}

function removeEmptyDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);
    removeEmptyDirs(fullPath);
    if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
  }
}

function readPackageJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath, "package.json"), "utf8"));
}

function createTemplatePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(path.join(sourceRoot, "package.json"), "utf8"));
  const runtimePkg = readPackageJson("packages/otok");
  const pluginPkg = readPackageJson("packages/vite-plugin-otok");

  pkg.name = "otok-app";
  delete pkg.scripts.test;
  delete pkg.scripts["test:e2e"];
  pkg.scripts.check = "pnpm typecheck && pnpm build";

  pkg.dependencies["@kamod-ui/core"] = "^0.1.5";
  pkg.dependencies.otok = `^${runtimePkg.version}`;

  pkg.devDependencies["@otok/vite-plugin"] = `^${pluginPkg.version}`;
  delete pkg.devDependencies["@playwright/test"];
  delete pkg.devDependencies.vitest;

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function buildTemplateFiles() {
  const files = new Map();
  for (const relativePath of collectFiles(path.join(sourceRoot, "src"), sourceRoot)) {
    if (excludedSourceFiles.has(relativePath)) continue;
    files.set(relativePath, fs.readFileSync(path.join(sourceRoot, relativePath), "utf8"));
  }

  files.set("vite.config.ts", fs.readFileSync(path.join(sourceRoot, "vite.config.ts"), "utf8"));
  files.set("tsconfig.json", templateTsconfig);
  files.set("package.json", createTemplatePackageJson());

  return files;
}

function checkTarget(targetRoot, files) {
  const expectedFiles = new Set(files.keys());
  const actualFiles = new Set(collectFiles(targetRoot));
  const problems = [];

  for (const relativePath of expectedFiles) {
    const targetPath = path.join(targetRoot, relativePath);
    if (!fs.existsSync(targetPath)) {
      problems.push(`missing ${path.relative(repoRoot, targetPath)}`);
      continue;
    }

    const expected = files.get(relativePath);
    const actual = fs.readFileSync(targetPath, "utf8");
    if (actual !== expected) problems.push(`outdated ${path.relative(repoRoot, targetPath)}`);
  }

  for (const relativePath of actualFiles) {
    if (expectedFiles.has(relativePath)) continue;
    problems.push(`extraneous ${path.relative(repoRoot, path.join(targetRoot, relativePath))}`);
  }

  return problems;
}

function syncTarget(targetRoot, files) {
  const allowedFiles = new Set(files.keys());
  for (const [relativePath, content] of files) {
    writeIfChanged(path.join(targetRoot, relativePath), content);
  }
  removeExtraneousFiles(targetRoot, allowedFiles);
  removeEmptyDirs(targetRoot);
}

const templateFiles = buildTemplateFiles();

if (checkMode) {
  const problems = targets.flatMap((targetRoot) => checkTarget(targetRoot, templateFiles));
  if (problems.length > 0) {
    console.error("Scaffold files are out of sync.");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log("Scaffold files are in sync.");
  process.exit(0);
}

for (const targetRoot of targets) syncTarget(targetRoot, templateFiles);
console.log("Synced scaffold files from apps/playground to templates/default and packages/create-otok/template.");
