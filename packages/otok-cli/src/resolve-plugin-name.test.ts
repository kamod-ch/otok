import { describe, expect, it } from "vitest";
import {
  OFFICIAL_PLUGIN_ALIASES,
  PluginNameError,
  pluginImportIdentifier,
  resolvePluginPackageName,
} from "../src/resolve-plugin-name.js";

describe("resolvePluginPackageName", () => {
  it("resolves official aliases", () => {
    expect(resolvePluginPackageName("oauth")).toBe("@kamod-ch/otok-oauth");
    expect(resolvePluginPackageName("i18n")).toBe("@kamod-ch/otok-i18n");
    expect(resolvePluginPackageName("kysely")).toBe("@kamod-ch/otok-kysely");
    expect(resolvePluginPackageName("seo")).toBe("@kamod-ch/otok-seo");
    expect(resolvePluginPackageName("security")).toBe("@kamod-ch/otok-security");
    expect(resolvePluginPackageName("observability")).toBe("@kamod-ch/otok-observability");
    expect(resolvePluginPackageName("kamod")).toBe("@kamod-ch/otok-kamod");
  });

  it("passes through scoped package names", () => {
    expect(resolvePluginPackageName("@scope/custom-plugin")).toBe("@scope/custom-plugin");
  });

  it("resolves otok-prefixed unscoped names to @kamod-ch scope", () => {
    expect(resolvePluginPackageName("otok-oauth")).toBe("@kamod-ch/otok-oauth");
  });

  it("rejects unknown short names", () => {
    expect(() => resolvePluginPackageName("unknown-plugin")).toThrow(PluginNameError);
  });

  it("documents all official aliases", () => {
    expect(Object.keys(OFFICIAL_PLUGIN_ALIASES)).toContain("oauth");
    expect(Object.keys(OFFICIAL_PLUGIN_ALIASES)).toContain("i18n");
  });
});

describe("pluginImportIdentifier", () => {
  it("derives oauth from @kamod-ch/otok-oauth", () => {
    expect(pluginImportIdentifier("@kamod-ch/otok-oauth")).toBe("oauth");
  });

  it("derives hello from @otok/plugin-hello", () => {
    expect(pluginImportIdentifier("@otok/plugin-hello")).toBe("hello");
  });

  it("derives customPlugin from scoped kebab-case", () => {
    expect(pluginImportIdentifier("@scope/custom-plugin")).toBe("customPlugin");
  });
});
