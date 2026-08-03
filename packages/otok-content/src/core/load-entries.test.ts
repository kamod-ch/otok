import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defineCollection, z } from "./define-collection.js";
import { buildContentManifest } from "./load-entries.js";
import { createRegistry } from "./registry.js";
import { ContentValidationError, DuplicateSlugError } from "./validation.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createFixture(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-content-"));
  tempDirs.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  return root;
}

const postSchema = z.object({
  title: z.string(),
  published: z.boolean().default(true),
  draft: z.boolean().optional(),
});

describe("defineCollection + buildContentManifest", () => {
  it("loads and validates markdown entries", async () => {
    const root = createFixture({
      "posts/hello.md": `---
title: Hello
published: true
---
# Hello world
`,
      "posts/world.md": `---
title: World
published: false
---
Content
`,
    });

    const posts = defineCollection({
      source: "posts/**/*.md",
      schema: postSchema,
    });

    const manifest = await buildContentManifest(createRegistry({ posts }).entries(), {
      root,
      mdx: true,
      gitDates: false,
      incremental: false,
    });

    expect(manifest.collections.posts?.entries).toHaveLength(2);
    expect(manifest.collections.posts?.entries[0]?.html).toContain("<h1");
    expect(manifest.searchIndex?.length).toBe(2);
  });

  it("filters drafts by default", async () => {
    const root = createFixture({
      "posts/draft.md": `---
title: Draft
draft: true
---
`,
      "posts/live.md": `---
title: Live
---
`,
    });

    const posts = defineCollection({
      source: "posts/**/*.md",
      schema: postSchema,
    });

    const manifest = await buildContentManifest(createRegistry({ posts }).entries(), {
      root,
      gitDates: false,
      incremental: false,
    });

    expect(manifest.collections.posts?.entries).toHaveLength(1);
    expect(manifest.collections.posts?.entries[0]?.slug).toBe("live");
  });

  it("throws on invalid frontmatter with file path", async () => {
    const root = createFixture({
      "posts/bad.md": `---
title: 123
---
`,
    });

    const strictSchema = z.object({ title: z.string().min(5) });
    const posts = defineCollection({ source: "posts/**/*.md", schema: strictSchema });

    await expect(
      buildContentManifest(createRegistry({ posts }).entries(), {
        root,
        gitDates: false,
        incremental: false,
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("detects duplicate slugs", async () => {
    const root = createFixture({
      "posts/a/hello.md": `---
title: One
---
`,
      "posts/b/hello.md": `---
title: Two
---
`,
    });

    const posts = defineCollection({ source: "posts/**/*.md", schema: postSchema });

    await expect(
      buildContentManifest(createRegistry({ posts }).entries(), {
        root,
        gitDates: false,
        incremental: false,
      }),
    ).rejects.toBeInstanceOf(DuplicateSlugError);
  });

  it("allows duplicate slug across locales", async () => {
    const root = createFixture({
      "docs/hello.md": `---
title: EN
---
`,
      "de/docs/hello.md": `---
title: DE
---
`,
    });

    const docs = defineCollection({ source: ["docs/**/*.md", "de/docs/**/*.md"], schema: postSchema });

    const manifest = await buildContentManifest(createRegistry({ docs }).entries(), {
      root,
      gitDates: false,
      incremental: false,
      locales: ["de", "en"],
      defaultLocale: "en",
    });

    expect(manifest.collections.docs?.entries).toHaveLength(2);
  });
});
