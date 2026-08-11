import { describe, expect, it } from "vitest";
import { PluginContainer } from "@kamod-ch/otok-config";
import kamod, { normalizeOptions } from "./plugin.js";
import { kamodStylesheetContent, kamodCssImports } from "./css.js";
import { satisfiesMinimum } from "./versions.js";

describe("kamod plugin", () => {
  it("registers tailwind vite plugin and theme dev stylesheet", async () => {
    const container = new PluginContainer(
      {
        plugins: [kamod({ theme: "default", icons: true, forms: true })],
      },
      { root: process.cwd(), mode: "development", command: "serve" },
    );

    const resolved = await container.resolve();
    expect(resolved.runtime.theme).toBe(true);
    expect(resolved.runtime.devStylesheets).toEqual(["/src/style.css"]);
    expect(resolved.vitePlugins.length).toBeGreaterThan(0);
  });

  it("validates unknown theme presets", () => {
    expect(() => normalizeOptions({ theme: "unknown" as "default" })).toThrow(/invalid/i);
  });

  it("builds css for brand presets", () => {
    expect(kamodCssImports("kamod")).toContain("@kamod-ch/themes/brands/kamod.css");
    expect(kamodStylesheetContent("default")).toContain("@kamod-ch/ui/theme.css");
  });

  it("compares semver-like versions", () => {
    expect(satisfiesMinimum("1.0.1", "1.0.0")).toBe(true);
    expect(satisfiesMinimum("0.9.0", "1.0.0")).toBe(false);
  });
});
