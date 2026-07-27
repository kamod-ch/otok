import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("otok-devtools production tree shaking", () => {
  it("guards client mounting behind import.meta.env.DEV", () => {
    const source = readFileSync(join(root, "src/client/mount.ts"), "utf8");
    expect(source).toMatch(/import\.meta[\s\S]*env\?\.DEV/);
  });

  it("limits the vite plugin to dev server builds", () => {
    const source = readFileSync(join(root, "src/vite/plugin.ts"), "utf8");
    expect(source).toContain('apply: "serve"');
    expect(source).toContain("import.meta.env.DEV");
  });

  it("skips configureApp hooks outside development", () => {
    const source = readFileSync(join(root, "src/index.ts"), "utf8");
    expect(source).toContain('mode !== "development"');
  });
});
