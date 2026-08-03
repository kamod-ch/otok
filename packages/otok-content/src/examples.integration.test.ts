import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./core/load-entries.js";
import { createRegistry } from "./core/registry.js";
import { blogPreset } from "./presets/blog.js";
import { docsPreset } from "./presets/docs.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("content examples integration", () => {
  it("builds blog example content", async () => {
    const root = path.join(repoRoot, "examples/content-blog/content");
    const manifest = await buildContentManifest(createRegistry(blogPreset).entries(), {
      root,
      gitDates: false,
      incremental: false,
    });
    expect(manifest.collections.posts?.entries.some((e) => e.slug === "welcome")).toBe(true);
    expect(manifest.collections.posts?.entries.some((e) => e.slug === "draft-example")).toBe(false);
  });

  it("builds docs example content", async () => {
    const root = path.join(repoRoot, "examples/content-docs/content");
    const manifest = await buildContentManifest(createRegistry(docsPreset).entries(), {
      root,
      gitDates: false,
      incremental: false,
    });
    expect(manifest.collections.docs?.entries).toHaveLength(2);
  });
});
