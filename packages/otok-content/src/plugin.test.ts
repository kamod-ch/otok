import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./core/markdown.js";
import { paginateCollection } from "./core/pagination.js";
import { renderRssFeed } from "./core/feeds.js";

describe("markdown + feeds", () => {
  it("renders markdown with toc", () => {
    const { html, toc } = renderMarkdown("# Title\n\n## Section\n");
    expect(html).toContain("<h1");
    expect(toc).toHaveLength(2);
  });

  it("paginates entries", () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      slug: String(i),
      route: `/p/${i}`,
      relativePath: `${i}.md`,
      file: `/tmp/${i}.md`,
      collection: "posts",
      data: {},
    }));
    const page = paginateCollection(entries, 2, 2);
    expect(page.entries).toHaveLength(2);
    expect(page.totalPages).toBe(3);
  });

  it("renders rss feed", () => {
    const xml = renderRssFeed({
      title: "Blog",
      origin: "https://example.com",
      collection: "posts",
      entries: [
        {
          id: "1",
          slug: "hello",
          route: "/posts/hello",
          relativePath: "hello.md",
          file: "/tmp/hello.md",
          collection: "posts",
          data: { title: "Hello", date: "2026-01-01" },
        },
      ],
    });
    expect(xml).toContain("<rss");
    expect(xml).toContain("Hello");
  });
});
