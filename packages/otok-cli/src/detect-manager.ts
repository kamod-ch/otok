import { access, constants } from "node:fs/promises";
import { join } from "node:path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(root: string): Promise<PackageManager> {
  if (await exists(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(join(root, "yarn.lock"))) return "yarn";
  if ((await exists(join(root, "bun.lock"))) || (await exists(join(root, "bun.lockb")))) return "bun";
  return "npm";
}

export function installCommand(
  manager: PackageManager,
  packageName: string,
): { command: string; args: string[] } {
  switch (manager) {
    case "pnpm":
      return { command: "pnpm", args: ["add", packageName] };
    case "yarn":
      return { command: "yarn", args: ["add", packageName] };
    case "bun":
      return { command: "bun", args: ["add", packageName] };
    default:
      return { command: "npm", args: ["install", packageName] };
  }
}
