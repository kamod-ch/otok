import { describe, expect, it } from "vitest";
import { PluginContainer, definePlugin, mergeUserConfig } from "./index.js";
import type { OtokUserConfig } from "./types.js";

const env = {
  root: "/tmp/app",
  mode: "test" as const,
  command: "build" as const,
};

describe("mergeUserConfig", () => {
  it("merges runtime keys without mutating the base config", () => {
    const base: OtokUserConfig = { theme: false, health: { ok: true } };
    const merged = mergeUserConfig(base, { theme: true, env: { PORT: "3000" } });

    expect(merged.theme).toBe(true);
    expect(merged.env).toEqual({ PORT: "3000" });
    expect(base.theme).toBe(false);
    expect(base.env).toBeUndefined();
  });
});

describe("PluginContainer", () => {
  it("runs config hooks in declared plugin order", async () => {
    const order: string[] = [];

    const first = definePlugin({
      name: "first",
      config() {
        order.push("first:config");
        return { theme: true };
      },
      configResolved() {
        order.push("first:configResolved");
      },
    });

    const second = definePlugin({
      name: "second",
      config() {
        order.push("second:config");
        return { streaming: true };
      },
      configResolved() {
        order.push("second:configResolved");
      },
    });

    const container = new PluginContainer({ plugins: [first(), second()] }, env);
    await container.resolve();

    expect(order).toEqual([
      "first:config",
      "second:config",
      "first:configResolved",
      "second:configResolved",
    ]);
  });

  it("rejects duplicate plugin names", () => {
    const plugin = definePlugin({ name: "duplicate" });
    expect(() => new PluginContainer({ plugins: [plugin(), plugin()] }, env)).toThrow(
      'Duplicate plugin name "duplicate"',
    );
  });

  it("validates plugin options through schema", () => {
    const plugin = definePlugin<{ count: number }>({
      name: "validated",
      schema: {
        parse(input) {
          if (typeof input !== "object" || input === null || typeof (input as { count?: unknown }).count !== "number") {
            throw new Error("count must be a number");
          }
          return input as { count: number };
        },
      },
    });

    expect(() => new PluginContainer({ plugins: [plugin({ count: "nope" as unknown as number })] }, env)).toThrow(
      "Invalid plugin options",
    );
  });

  it("runs buildEnd hooks in reverse order", async () => {
    const order: string[] = [];
    const first = definePlugin({
      name: "first",
      buildEnd() {
        order.push("first");
      },
    });
    const second = definePlugin({
      name: "second",
      buildEnd() {
        order.push("second");
      },
    });

    const container = new PluginContainer({ plugins: [first(), second()] }, env);
    await container.runBuildEnd(false);

    expect(order).toEqual(["second", "first"]);
  });

  it("collects virtual modules with stable names", async () => {
    const plugin = definePlugin({
      name: "demo",
      virtualModules: {
        meta: () => 'export const message = "hello";',
      },
    });

    const resolved = await new PluginContainer({ plugins: [plugin()] }, env).resolve();
    expect([...resolved.virtualModules.keys()]).toEqual(["virtual:otok-plugin/demo/meta"]);
  });
});
