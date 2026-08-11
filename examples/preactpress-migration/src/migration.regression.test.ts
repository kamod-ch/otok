import { describe, expect, it } from "vitest";
import { buildContentManifest } from "@kamod-ch/otok-content";
import { createRegistry } from "@kamod-ch/otok-content";
import { collections } from "../content.config.js";
import { listDocRoutes, getEntryByRoute } from "./lib/content.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exampleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(exampleRoot, "content");

describe("preactpress-migration example", () => {
  it("builds content manifest with expected doc pages", async () => {
    const manifest = await buildContentManifest(createRegistry(collections).entries(), {
      root: contentRoot,
      gitDates: false,
      incremental: false,
      locales: ["en", "de"],
      defaultLocale: "en",
    });

    const { setContentManifest } = await import("./lib/content.js");
    setContentManifest(manifest);

    const routes = listDocRoutes();
    expect(routes.some((r) => r.includes("getting-started"))).toBe(true);
    expect(routes.some((r) => r.includes("markdown-examples"))).toBe(true);

    const entry = getEntryByRoute("/docs/getting-started");
    const data = entry?.data as { title?: unknown } | undefined;
    expect(data?.title).toBe("Getting started");
    expect(entry?.html).toContain("pnpm install");
  });

  it("includes german locale content", async () => {
    const manifest = await buildContentManifest(createRegistry(collections).entries(), {
      root: contentRoot,
      gitDates: false,
      incremental: false,
      locales: ["en", "de"],
      defaultLocale: "en",
    });
    const deEntry = manifest.collections.docs?.entries.find((e) => e.route.startsWith("/de/"));
    expect(deEntry).toBeDefined();
  });
});
