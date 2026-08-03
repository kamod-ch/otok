import { describe, expect, it } from "vitest";
import { defineMeta } from "./define-meta.js";
import { resolveMetaToHead } from "./resolve.js";
import { renderRobotsTxt } from "./robots.js";
import { createSitemapEntries, renderSitemapXml } from "./sitemap.js";
import { renderRssFeed } from "./feeds.js";

describe("resolveMetaToHead", () => {
  it("renders title template, canonical, OG, and Twitter tags", () => {
    const head = resolveMetaToHead(
      {
        title: "Product",
        description: "A great product",
        canonical: "/products/widget",
        openGraph: { type: "product" },
        twitter: { card: "summary_large_image" },
      },
      {
        origin: "https://example.com",
        titleTemplate: "%s | Shop",
        siteName: "Shop",
        defaultOgImage: "/og.png",
      },
    );

    expect(head.title).toBe("Product | Shop");
    expect(head.description).toBe("A great product");
    expect(head.propertyMeta?.["og:type"]).toBe("product");
    expect(head.propertyMeta?.["og:image"]).toBe("https://example.com/og.png");
    expect(head.meta?.["twitter:card"]).toBe("summary_large_image");
    expect(head.links?.some((l) => l.rel === "canonical")).toBe(true);
  });
});

describe("defineMeta", () => {
  it("produces a head function from loader data", async () => {
    const head = defineMeta(({ data }) => {
      const product = (data as { product: { name: string; description: string; slug: string } }).product;
      return {
        title: product.name,
        description: product.description,
        canonical: `/products/${product.slug}`,
        openGraph: { type: "product" },
      };
    });

    const data = { product: { name: "Widget", description: "Nice", slug: "widget" } };
    const result = await head({
      data,
      loaderData: data,
      params: {},
      route: "/products/:slug",
    });

    expect(result.title).toBe("Widget");
    expect(result.propertyMeta?.["og:type"]).toBe("product");
  });
});

describe("robots and sitemap", () => {
  it("renders robots.txt with sitemap", () => {
    const body = renderRobotsTxt({ origin: "https://example.com" });
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("renders sitemap xml", () => {
    const xml = renderSitemapXml(
      createSitemapEntries({ origin: "https://example.com", paths: ["/", "/about"] }),
    );
    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<loc>https://example.com/about</loc>");
  });
});

describe("feeds", () => {
  it("renders RSS feed", async () => {
    const xml = await renderRssFeed({
      origin: "https://example.com",
      format: "rss",
      feed: {
        path: "/feed.xml",
        title: "Blog",
        items: [{ id: "1", title: "Hello", link: "/hello" }],
      },
    });
    expect(xml).toContain("<title>Hello</title>");
    expect(xml).toContain("https://example.com/hello");
  });
});
