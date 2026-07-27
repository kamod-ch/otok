import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { addPlugin } from "../src/commands/add.js";

function scaffoldProject(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `otok-add-${name}-`));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "test-app", private: true }, null, 2),
  );
  writeFileSync(join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
  writeFileSync(join(dir, "vite.config.ts"), "export default {};\n");
  return dir;
}

describe("addPlugin", () => {
  it("creates otok.config.ts when missing", async () => {
    const root = scaffoldProject("create-config");
    try {
      const result = await addPlugin("@otok/plugin-hello", {
        cwd: root,
        skipInstall: true,
        dryRun: false,
      });

      expect(result.configChanged).toBe(true);
      expect(readFileSync(join(root, "otok.config.ts"), "utf8")).toContain("@otok/plugin-hello");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips config changes for an already installed plugin", async () => {
    const root = scaffoldProject("existing");
    const fixture = join(import.meta.dirname, "fixtures/with-plugin/otok.config.ts");
    writeFileSync(join(root, "otok.config.ts"), readFileSync(fixture, "utf8"));

    try {
      const result = await addPlugin("@otok/plugin-hello", {
        cwd: root,
        skipInstall: true,
        dryRun: true,
      });

      expect(result.alreadyInstalled).toBe(true);
      expect(result.configChanged).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("is idempotent across two runs", async () => {
    const root = scaffoldProject("idempotent");
    writeFileSync(
      join(root, "otok.config.ts"),
      readFileSync(join(import.meta.dirname, "fixtures/empty-config/otok.config.ts"), "utf8"),
    );

    try {
      const first = await addPlugin("@otok/plugin-hello", {
        cwd: root,
        skipInstall: true,
        dryRun: false,
      });
      expect(first.alreadyInstalled).toBe(false);

      const second = await addPlugin("@otok/plugin-hello", {
        cwd: root,
        skipInstall: true,
        dryRun: false,
      });
      expect(second.alreadyInstalled).toBe(true);

      const content = readFileSync(join(root, "otok.config.ts"), "utf8");
      expect(content.match(/@otok\/plugin-hello/g)?.length).toBe(1);
      expect(content.match(/hello\(\)/g)?.length).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
