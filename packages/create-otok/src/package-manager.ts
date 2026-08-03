import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";

  if (await exists(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(join(cwd, "yarn.lock"))) return "yarn";
  if ((await exists(join(cwd, "bun.lock"))) || (await exists(join(cwd, "bun.lockb")))) return "bun";
  return "npm";
}

export function installArgs(manager: PackageManager): { command: string; args: string[] } {
  switch (manager) {
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "bun":
      return { command: "bun", args: ["install"] };
    default:
      return { command: "npm", args: ["install"] };
  }
}

export function devCommand(manager: PackageManager): string {
  switch (manager) {
    case "pnpm":
      return "pnpm dev";
    case "yarn":
      return "yarn dev";
    case "bun":
      return "bun run dev";
    default:
      return "npm run dev";
  }
}

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function initGit(targetDir: string): boolean {
  const init = spawnSync("git", ["init"], { cwd: targetDir, encoding: "utf8" });
  return init.status === 0;
}
