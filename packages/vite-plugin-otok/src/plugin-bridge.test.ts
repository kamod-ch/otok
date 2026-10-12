import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "vite";
import { findOtokConfigFile, importOtokConfigFile } from "./config-loader.js";
import { loadResolvedOtokConfig } from "./plugin-bridge.js";
import { fileURLToPath } from "node:url";
import otok from "./index.js";

const OTOK_CONFIG_PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../otok-config/dist/index.js");

type ViteBuildHook = "buildStart" | "buildEnd";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function invokeViteHook(plugin: Plugin, hook: ViteBuildHook, options?: { ssr?: boolean }): Promise<void> {
  const registered = plugin[hook];
  if (!registered) return;
  const handler = typeof registered === "function" ? registered : registered.handler;
  await (handler as unknown as (opts: { ssr: boolean }) => Promise<void>).call(plugin as unknown as object, {
    ssr: options?.ssr ?? false,
  });
}

async function initOtokPlugin(root: string, options?: { typegen?: boolean; ssr?: boolean }) {
  const previousCwd = process.cwd();
  process.chdir(root);
  const pluginContext = {} as never;
  try {
    const [plugin] = otok({ typegen: options?.typegen ?? false });
    const configHook = plugin.config;
    if (typeof configHook === "function") {
      await configHook.call(pluginContext, {}, { mode: "test", command: "build" });
    } else if (configHook?.handler) {
      await configHook.handler.call(pluginContext, {}, { mode: "test", command: "build" });
    }
    const resolvedConfig = { root, build: { ssr: options?.ssr ?? false } };
    const configResolvedHook = plugin.configResolved;
    if (typeof configResolvedHook === "function") {
      await configResolvedHook.call(pluginContext, resolvedConfig as never);
    } else if (configResolvedHook?.handler) {
      await configResolvedHook.handler.call(pluginContext, resolvedConfig as never);
    }
    return plugin;
  } finally {
    process.chdir(previousCwd);
  }
}

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

describe("vite build hook bridge", () => {
  const bridgeTestGlobal = "__otokViteBridgeTest";

  it(
    "awaits delayed plugin buildStart before the hook resolves",
    withFixture(
      {
        "src/app/routes/index.tsx": "export default function Home() {}",
        "otok.config.mjs": `
const gate = globalThis.${bridgeTestGlobal};
export default {
  plugins: [{
    name: "delayed-build-start",
    async buildStart() {
      await gate.buildStart.promise;
      gate.buildStartOrder.push("plugin");
    },
  }],
};
`.trim(),
      },
      async (root) => {
        const gate = {
          buildStart: deferred<void>(),
          buildStartOrder: [] as string[],
        };
        (globalThis as Record<string, unknown>)[bridgeTestGlobal] = gate;

        const plugin = await initOtokPlugin(root);
        const hookPromise = invokeViteHook(plugin, "buildStart");
        let settled = false;
        void hookPromise.then(() => {
          settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);

        gate.buildStart.resolve();
        await hookPromise;
        expect(gate.buildStartOrder).toEqual(["plugin"]);
      },
    ),
  );

  it(
    "awaits delayed plugin buildEnd and SSR adapter finish in order",
    withFixture(
      {
        "src/app/routes/index.tsx": "export default function Home() {}",
        "otok.config.mjs": `
import { defineAdapter, definePlugin } from "${OTOK_CONFIG_PKG.replace(/\\/g, "/")}";
const gate = globalThis.${bridgeTestGlobal};
const testAdapter = defineAdapter({
  name: "bridge-test-adapter",
  runtime: "node",
  capabilities: ["ssr"],
  outputDirs() {
    return { root: "dist", client: "dist/client", server: "dist/server" };
  },
  ssr: { supported: true },
  hooks: {
    async finish() {
      await gate.finish.promise;
      gate.events.push("finish");
    },
    async cleanup() {
      gate.events.push("cleanup");
    },
  },
});
export default {
  adapter: testAdapter,
  plugins: [definePlugin({
    name: "delayed-build-end",
    async buildEnd() {
      await gate.buildEnd.promise;
      gate.events.push("plugin-build-end");
    },
  })()],
};
`.trim(),
      },
      async (root) => {
        const gate = {
          buildEnd: deferred<void>(),
          finish: deferred<void>(),
          events: [] as string[],
        };
        (globalThis as Record<string, unknown>)[bridgeTestGlobal] = gate;

        const plugin = await initOtokPlugin(root, { ssr: true });
        const hookPromise = invokeViteHook(plugin, "buildEnd", { ssr: true });
        let settled = false;
        void hookPromise.then(() => {
          settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);

        gate.buildEnd.resolve();
        await Promise.resolve();
        expect(settled).toBe(false);
        expect(gate.events).toEqual(["plugin-build-end"]);

        gate.finish.resolve();
        await hookPromise;
        expect(gate.events).toEqual(["plugin-build-end", "finish", "cleanup"]);
      },
    ),
  );

  it(
    "surfaces plugin buildStart rejections through the vite hook",
    withFixture(
      {
        "src/app/routes/index.tsx": "export default function Home() {}",
        "otok.config.mjs": `
export default {
  plugins: [{
    name: "failing-build-start",
    async buildStart() {
      throw new Error("build-start-failed");
    },
  }],
};
`.trim(),
      },
      async (root) => {
        const plugin = await initOtokPlugin(root);
        await expect(invokeViteHook(plugin, "buildStart")).rejects.toThrow("build-start-failed");
      },
    ),
  );

  it("resolves build hooks when no plugin container is configured", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-config-"));
    try {
      fs.mkdirSync(path.join(root, "src/app/routes"), { recursive: true });
      fs.writeFileSync(path.join(root, "src/app/routes/index.tsx"), "export default function Home() {}");
      const plugin = await initOtokPlugin(root);
      await expect(invokeViteHook(plugin, "buildStart")).resolves.toBeUndefined();
      await expect(invokeViteHook(plugin, "buildEnd")).resolves.toBeUndefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

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
