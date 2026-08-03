import fs from "node:fs";
import path from "node:path";

const PACKAGE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidPackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  if (name === "." || name === "..") return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  return PACKAGE_NAME_RE.test(name);
}

export function resolveTargetDir(cwd: string, name: string): string {
  const resolved = path.resolve(cwd, name);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`otok: target path must stay inside the current directory (${name}).`);
  }
  return resolved;
}

export function assertTargetDirectory(target: string, force: boolean): void {
  if (!fs.existsSync(target)) return;
  const entries = fs.readdirSync(target).filter((e) => e !== ".DS_Store");
  if (entries.length === 0) return;
  if (!force) {
    throw new Error(`otok: target directory is not empty: ${target}\nUse --force to scaffold anyway.`);
  }
}

export function packageNameFromPath(targetDir: string): string {
  return path.basename(targetDir);
}
