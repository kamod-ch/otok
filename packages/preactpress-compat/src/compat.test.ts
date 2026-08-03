import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContentManifest } from "@kamod-ch/otok-content";
import { createRegistry } from "@kamod-ch/otok-content";
import { docsPreset } from "@kamod-ch/otok-content/presets";
import {
  buildPreactPressSearchIndex,
  mapThemeConfig,
  otokRouteToPreactPressPath,
  preactPressFileToOtokRoute,
  resolveSidebarForRoute,
} from "./index.js";

describe("@kamod-ch/preactpress-compat", () => {
  it("maps preactpress file paths to otok routes", () => {
    expect(preactPressFileToOtokRoute("guide/getting-started.md")).toBe("/docs/guide/getting-started");
    expect(preactPressFileToOtokRoute("index.md")).toBe("/");
    expect(preactPressFileToOtokRoute("de/guide/getting-started.md")).toBe("/de/docs/guide/getting-started");
  });

  it("maps otok routes back to content paths", () => {
    expect(otokRouteToPreactPressPath("/docs/guide/foo")).toBe("docs/guide/foo.md");
    expect(otokRouteToPreactPressPath("/de/docs/guide/foo")).toBe("de/docs/guide/foo.md");
  });

  it("maps themeConfig nav and sidebar", () => {
    const theme = mapThemeConfig({
      nav: [{ text: "Guide", link: "/docs/getting-started" }],
      sidebar: [
        {
          text: "Intro",
          items: [{ text: "Start", link: "/docs/getting-started" }],
        },
      ],
      search: true,
      outline: true,
      footer: "Built with PreactPress on Otok",
    });
    expect(theme.nav[0]?.label).toBe("Guide");
    expect(theme.searchEnabled).toBe(true);
    expect(theme.sidebar["/"]?.[0]?.children?.[0]?.href).toBe("/docs/getting-started");
    expect(resolveSidebarForRoute(theme, "/docs/foo")).toEqual(theme.sidebar["/"]);
  });

  it("builds preactpress-compatible search index from manifest", async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const root = path.join(repoRoot, "examples/content-docs/content");
    const manifest = await buildContentManifest(createRegistry(docsPreset).entries(), {
      root,
      gitDates: false,
      incremental: false,
    });
    const index = buildPreactPressSearchIndex(manifest);
    expect(index.length).toBeGreaterThan(0);
    expect(index[0]).toMatchObject({
      route: expect.any(String),
      title: expect.any(String),
    });
  });
});
