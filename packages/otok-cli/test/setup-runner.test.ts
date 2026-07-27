import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { applySetupChanges } from "../src/setup-runner.js";

describe("applySetupChanges", () => {
  it("appends to .env.example without overwriting", async () => {
    const root = mkdtempSync(join(tmpdir(), "otok-setup-"));
    writeFileSync(join(root, ".env.example"), "PORT=3000\n");

    try {
      const applied = await applySetupChanges(
        [{ kind: "append-file", path: ".env.example", content: "SECRET=abc\n" }],
        { root, packageName: "@test/pkg", dryRun: false },
      );

      expect(applied).toEqual([".env.example"]);
      expect(readFileSync(join(root, ".env.example"), "utf8")).toBe("PORT=3000\nSECRET=abc\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite existing create targets", async () => {
    const root = mkdtempSync(join(tmpdir(), "otok-setup-create-"));
    mkdirSync(join(root, "config"), { recursive: true });
    writeFileSync(join(root, "config/example.ts"), "export {};\n");

    try {
      await expect(
        applySetupChanges(
          [{ kind: "create-file", path: "config/example.ts", content: "export const x = 1;\n" }],
          { root, packageName: "@test/pkg", dryRun: false },
        ),
      ).rejects.toThrow(/Refusing to overwrite/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
