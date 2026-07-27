import { describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectPackageManager } from "../src/detect-manager.js";

function withLockfile(lockfile: string, run: (dir: string) => Promise<void>): Promise<void> {
  const dir = join(tmpdir(), `otok-cli-pm-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, lockfile), "lockfile\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  return run(dir).finally(() => {
    rmSync(dir, { recursive: true, force: true });
  });
}

describe("detectPackageManager", () => {
  it("detects pnpm from pnpm-lock.yaml", async () => {
    await withLockfile("pnpm-lock.yaml", async (dir) => {
      await expect(detectPackageManager(dir)).resolves.toBe("pnpm");
    });
  });

  it("detects yarn from yarn.lock", async () => {
    await withLockfile("yarn.lock", async (dir) => {
      await expect(detectPackageManager(dir)).resolves.toBe("yarn");
    });
  });

  it("detects bun from bun.lock", async () => {
    await withLockfile("bun.lock", async (dir) => {
      await expect(detectPackageManager(dir)).resolves.toBe("bun");
    });
  });

  it("falls back to npm", async () => {
    await withLockfile("package-lock.json", async (dir) => {
      await expect(detectPackageManager(dir)).resolves.toBe("npm");
    });
  });
});
