import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findOtokConfigFile, importOtokConfigFile } from "./config-loader.js";
import { loadResolvedOtokConfig } from "./plugin-bridge.js";

function withFixture(files: Record<string, string>, test: (root: string) => Promise<void>) {
  return async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-config-"));
    try {
      for (const [file, contents] of Object.entries(files)) {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
      }
      await test(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

describe("otok config loading", () => {
  it(
    "finds otok.config.ts in the project root",
    withFixture(
      {
        "otok.config.ts": "export default { theme: true };",
      },
      async (root) => {
        expect(findOtokConfigFile(root)).toContain("otok.config.ts");
      },
    ),
  );

  it(
    "loads plain JS config files",
    withFixture(
      {
        "otok.config.mjs": "export default { theme: true, streaming: true };",
      },
      async (root) => {
        const configFile = findOtokConfigFile(root)!;
        const userConfig = await importOtokConfigFile(configFile);
        expect(userConfig).toEqual({ theme: true, streaming: true });
      },
    ),
  );

  it(
    "resolves plugins discovered in otok.config.mjs",
    withFixture(
      {
        "otok.config.mjs": `
export default {
  plugins: [{
    name: "inline-fixture",
    config() {
      return {
        theme: true,
        env: { FIXTURE_PREFIX: "playground" },
      };
    },
    envSchema: {
      parse(input) {
        return { fixturePrefix: input.FIXTURE_PREFIX ?? "fixture" };
      },
    },
  }],
};
`.trim(),
      },
      async (root) => {
        const loaded = await loadResolvedOtokConfig(undefined, root, "test", "build");
        expect(loaded.resolved.runtime.theme).toBe(true);
        expect(loaded.resolved.env).toEqual({ fixturePrefix: "playground" });
        expect(loaded.configModuleSource).toContain("loadOtokResolvedConfig");
      },
    ),
  );
});
