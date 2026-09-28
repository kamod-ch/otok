import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgDir = dirname(fileURLToPath(import.meta.url));

describe("core package boundary", () => {
  it("does not declare runtime UI or database driver dependencies", () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "../package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const runtimeDeps = pkg.dependencies ?? {};
    const forbiddenRuntime = ["preact", "react", "react-dom", "@kamod-ch/ui", "kysely", "pg", "better-sqlite3"];
    for (const name of forbiddenRuntime) {
      expect(runtimeDeps[name], `unexpected runtime dependency ${name}`).toBeUndefined();
    }
    expect(pkg.peerDependencies?.kysely).toBeDefined();
  });

  it("loads core entry without optional otok peer", async () => {
    const mod = await import("./index.js");
    expect(typeof mod.parseDiscussionsConfig).toBe("function");
    expect(mod.DiscussionError).toBeDefined();
  });

  it("declares optional ui subpath without runtime kamod deps", () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "../package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
      peerDependencies?: Record<string, string>;
    };
    expect(pkg.exports?.["./ui"]).toBeDefined();
    expect(pkg.peerDependencies?.["@kamod-ch/ui"]).toBeDefined();
    expect(pkg.peerDependencies?.["@kamod-ch/icons"]).toBeDefined();
  });
});
