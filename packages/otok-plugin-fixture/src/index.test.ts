import { describe, expect, it, beforeEach } from "vitest";
import { PluginContainer } from "otok";
import fixture, { readFixtureHookLog, resetFixtureHookLog } from "./index.js";

const env = {
  root: "/tmp/fixture",
  mode: "test" as const,
  command: "build" as const,
};

describe("otok-plugin-fixture", () => {
  beforeEach(() => {
    resetFixtureHookLog();
  });

  it("merges config and records lifecycle hooks", async () => {
    const resolved = await new PluginContainer({ plugins: [fixture({ prefix: "demo" })] }, env).resolve();

    expect(resolved.runtime.theme).toBe(true);
    expect(resolved.env).toEqual({ fixturePrefix: "demo" });
    expect(resolved.vitePlugins).toHaveLength(1);
    expect(resolved.vitePlugins[0]?.name).toBe("otok-plugin-fixture:vite-marker");
    expect([...resolved.virtualModules.keys()]).toEqual(["virtual:otok-plugin/otok-plugin-fixture/meta"]);
    expect(readFixtureHookLog().map((entry) => entry.phase)).toEqual(["config", "configResolved", "configureVite"]);
  });
});
