import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findOtokConfigFile } from "./project.js";
import { exists } from "./detect-manager.js";

export async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    dryRun?: boolean;
    capture?: boolean;
    allowFailure?: boolean;
  } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const printable = [command, ...args].join(" ");
  if (options.dryRun) {
    process.stdout.write(`[dry-run]${options.cwd ? ` (${options.cwd})` : ""} ${printable}\n`);
    return { code: 0, stdout: "", stderr: "" };
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => (stdout += chunk));
      child.stderr?.on("data", (chunk: string) => (stderr += chunk));
    }

    child.on("error", reject);
    child.on("close", (code) => {
      const actualCode = code ?? 1;
      if (actualCode !== 0 && !options.allowFailure) {
        reject(
          new Error(
            `${printable} failed with exit code ${actualCode}${stderr.trim() ? `\n${stderr.trim()}` : ""}`,
          ),
        );
        return;
      }
      resolve({ code: actualCode, stdout, stderr });
    });
  });
}

export async function findProjectRoot(startDir: string): Promise<string> {
  let current = startDir;
  while (true) {
    if (await exists(join(current, "package.json"))) {
      if ((await findOtokConfigFile(current)) || (await exists(join(current, "vite.config.ts")))) {
        return current;
      }
    }

    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    "Could not find an Otok project. Run this command from an app directory with package.json and otok.config.ts (or vite.config.ts).",
  );
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;

  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${message} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

export const ok = (message: string): void => {
  process.stdout.write(`✓ ${message}\n`);
};

export const warn = (message: string): void => {
  process.stderr.write(`! ${message}\n`);
};

export const fail = (message: string): void => {
  process.stderr.write(`✗ ${message}\n`);
};
