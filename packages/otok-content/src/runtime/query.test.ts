import { describe, expect, it } from "vitest";
import { setContentManifest, getCollection, getEntry } from "./query.js";
import type { ContentManifest } from "../core/types.js";

const manifest: ContentManifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  root: "content",
  collections: {
    posts: {
      name: "posts",
      cacheTag: "content:posts",
      entries: [
        {
          id: "posts/a",
          slug: "a",
          route: "/posts/a",
          relativePath: "posts/a.md",
          file: "/tmp/posts/a.md",
          data: { title: "A", published: true },
        },
        {
          id: "posts/b",
          slug: "b",
          route: "/posts/b",
          relativePath: "posts/b.md",
          file: "/tmp/posts/b.md",
          data: { title: "B", published: false },
        },
      ],
    },
  },
};

describe("runtime query API", () => {
  it("getCollection filters entries", async () => {
    setContentManifest(manifest);
    const published = await getCollection("posts", ({ data }) => (data as { published: boolean }).published);
    expect(published).toHaveLength(1);
    expect(published[0]?.slug).toBe("a");
  });

  it("getEntry finds by slug", async () => {
    setContentManifest(manifest);
    const entry = await getEntry("posts", "b");
    expect(entry?.data).toEqual({ title: "B", published: false });
  });
});
