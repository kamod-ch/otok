import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { VersionMatrix } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

export function loadVersionMatrix(): VersionMatrix {
  const matrixPath = path.join(packageRoot, "versions.json");
  return JSON.parse(fs.readFileSync(matrixPath, "utf8")) as VersionMatrix;
}

export const STARTER_DIRS: Record<string, string> = {
  minimal: "otok-starter-minimal",
  kamod: "otok-starter-kamod",
  dashboard: "otok-starter-dashboard",
  saas: "otok-starter-saas",
  crm: "otok-starter-crm",
  content: "otok-starter-content",
  api: "otok-starter-api",
};

export function resolveStarterDir(starterKey: string): string {
  const dirName = STARTER_DIRS[starterKey];
  if (!dirName) throw new Error(`otok: unknown starter "${starterKey}".`);
  const candidates = [
    path.join(packageRoot, dirName),
    ...(starterKey === "minimal" ? [path.join(packageRoot, "template-minimal")] : []),
    ...(starterKey === "dashboard"
      ? [path.join(packageRoot, "template"), path.join(packageRoot, "../../templates/default")]
      : []),
  ];
  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!found) throw new Error(`otok: starter "${starterKey}" (${dirName}) not found in create-otok package.`);
  return found;
}

export function resolveLayerDir(layerName: string): string {
  const layerPath = path.join(packageRoot, "layers", layerName);
  if (!fs.existsSync(layerPath)) throw new Error(`otok: unknown layer "${layerName}".`);
  return layerPath;
}

export function copyDirectory(source: string, target: string, ignore = new Set(["node_modules", "dist", ".git"])): void {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to, ignore);
    else fs.copyFileSync(from, to);
  }
}

export function mergeLayer(sourceRoot: string, targetRoot: string, relative = ""): string[] {
  const written: string[] = [];
  const current = path.join(sourceRoot, relative);
  if (!fs.existsSync(current)) return written;

  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    const from = path.join(sourceRoot, rel);
    const to = path.join(targetRoot, rel);
    if (entry.isDirectory()) {
      written.push(...mergeLayer(sourceRoot, targetRoot, rel));
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      written.push(rel);
    }
  }
  return written;
}

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export function patchPackageJson(
  targetDir: string,
  options: {
    name: string;
    matrix: VersionMatrix;
    patches?: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
  },
): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJson;
  pkg.name = options.name;

  const pin = (record: Record<string, string> | undefined) => {
    if (!record) return;
    for (const key of Object.keys(record)) {
      if (options.matrix[key]) record[key] = options.matrix[key];
    }
  };
  pin(pkg.dependencies);
  pin(pkg.devDependencies);

  if (options.patches?.dependencies) {
    pkg.dependencies = { ...pkg.dependencies, ...options.patches.dependencies };
  }
  if (options.patches?.devDependencies) {
    pkg.devDependencies = { ...pkg.devDependencies, ...options.patches.devDependencies };
  }
  if (options.patches?.scripts) {
    pkg.scripts = { ...pkg.scripts, ...options.patches.scripts };
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

export function writeEnvExample(targetDir: string, lines: string[]): void {
  fs.writeFileSync(path.join(targetDir, ".env.example"), `${lines.join("\n")}\n`);
}
