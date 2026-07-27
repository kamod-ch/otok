import { describe, expect, it } from "vitest";
import { defineAdapter, hasAdapterCapability, resolveAdapter, assertAdapterCapability } from "./adapter.js";
import { PluginContainer, definePlugin } from "./index.js";

const env = {
  root: "/tmp/app",
  mode: "test" as const,
  command: "build" as const,
};

const testAdapter = defineAdapter<{ outDir?: string }>({
  name: "otok-adapter-test",
  runtime: "node",
  capabilities: ["ssr", "node-apis"],
  outputDirs(options, _root) {
    const root = options.outDir ?? "dist";
    return { root, client: `${root}/client`, server: `${root}/server` };
  },
  ssr: { supported: true },
  middleware: { supported: true },
});

describe("resolveAdapter", () => {
  it("resolves factory options and output directories", () => {
    const resolved = resolveAdapter(testAdapter({ outDir: "build" }), "/app");
    expect(resolved?.adapter.name).toBe("otok-adapter-test");
    expect(resolved?.outDirs).toEqual({
      root: "build",
      client: "build/client",
      server: "build/server",
    });
    expect(hasAdapterCapability(resolved, "ssr")).toBe(true);
    expect(hasAdapterCapability(resolved, "prerender")).toBe(false);
  });

  it("throws a readable error when a capability is missing", () => {
    const resolved = resolveAdapter(testAdapter(), "/app");
    expect(() => assertAdapterCapability(resolved, "prerender", "Demo plugin")).toThrow(
      'Requires capability "prerender"',
    );
  });
});

describe("PluginContainer adapter integration", () => {
  it("registers the adapter as the first plugin", async () => {
    const plugin = definePlugin({
      name: "app-plugin",
      configResolved(ctx) {
        expect(ctx.config.theme).toBe(true);
      },
    });

    const container = new PluginContainer(
      {
        adapter: testAdapter({ outDir: "dist" }),
        plugins: [plugin()],
        theme: true,
      },
      env,
    );

    const resolved = await container.resolve();
    expect(resolved.adapter?.adapter.name).toBe("otok-adapter-test");
    expect(container.plugins[0]?.name).toBe("otok-adapter-test");
    expect(container.plugins[1]?.name).toBe("app-plugin");
  });
});
