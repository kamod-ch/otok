import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTestApp } from "@kamod-ch/otok-test";
import seo from "./plugin.js";
import { resetSeoRuntimeForTests } from "./registry.js";

describe("seo plugin routes", () => {
  beforeEach(() => {
    resetSeoRuntimeForTests();
  });

  it("serves robots.txt and sitemap.xml", async () => {
    const plugin = seo({
      origin: "https://example.com",
      sitemapPaths: ["/", "/about"],
    });

    const app = new Hono();
    plugin.configureApp?.({
      app,
      root: "/tmp",
      mode: "test",
      command: "serve",
      userConfig: {},
      config: {},
    } as never);
    app.all("*", (c) => c.text("ok"));

    const robots = await app.request("/robots.txt");
    expect(robots.status).toBe(200);
    expect(await robots.text()).toContain("Sitemap: https://example.com/sitemap.xml");

    const sitemap = await app.request("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(await sitemap.text()).toContain("https://example.com/about");
  });
});

describe("defineMeta SSR integration", () => {
  beforeEach(() => {
    resetSeoRuntimeForTests();
  });

  it("injects SEO tags into rendered HTML", async () => {
    resetSeoRuntimeForTests();
    seo({ origin: "https://example.com", robots: false, sitemap: false });

    const { defineMeta } = await import("./define-meta.js");
    const head = defineMeta(
      ({ data }) => ({
        title: (data as { title: string }).title,
        description: "Desc",
        canonical: "/page",
        openGraph: { type: "website" },
      }),
      { origin: "https://example.com", titleTemplate: "%s | Site" },
    );

    const app = createTestApp({
      routes: [
        {
          path: "/",
          loader: () => ({ title: "Page" }),
          module: { head },
        },
      ],
    });

    const response = await app.request("/");
    const html = await response.text();
    expect(html).toContain("Page | Site");
    expect(html).toContain('property="og:type"');
    expect(html).toContain('rel="canonical"');
  });
});
