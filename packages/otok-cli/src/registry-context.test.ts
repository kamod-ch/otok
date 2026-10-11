import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadProjectSnapshot } from "./registry-context.js";

function writeProject(dir: string, deps: Record<string, string>, devDeps: Record<string, string> = {}): void {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture-app", private: true, dependencies: deps, devDependencies: devDeps }, null, 2),
  );
}

describe("loadProjectSnapshot core detection", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("prefers scoped @kamod-ch/otok over legacy otok name", async () => {
    dir = mkdtempSync(join(tmpdir(), "otok-snapshot-scoped-"));
    writeProject(dir, {
      "@kamod-ch/otok": "^2.0.0",
      otok: "^0.4.0",
      "otok-adapter-node": "^2.0.0",
    });
    const snapshot = await loadProjectSnapshot(dir);
    expect(snapshot.otokVersion).toBe("2.0.0");
    expect(snapshot.adapter).toBe("node");
  });

  it("reads legacy otok when scoped core is absent", async () => {
    dir = mkdtempSync(join(tmpdir(), "otok-snapshot-legacy-"));
    writeProject(dir, { otok: "~0.4.5", "otok-adapter-cloudflare": "^2.0.0" });
    const snapshot = await loadProjectSnapshot(dir);
    expect(snapshot.otokVersion).toBe("0.4.5");
    expect(snapshot.adapter).toBe("cloudflare");
  });

  it("returns undefined otok version when core is missing", async () => {
    dir = mkdtempSync(join(tmpdir(), "otok-snapshot-missing-"));
    writeProject(dir, { "otok-adapter-static": "^2.0.0" });
    const snapshot = await loadProjectSnapshot(dir);
    expect(snapshot.otokVersion).toBeUndefined();
    expect(snapshot.adapter).toBe("static");
  });
});
