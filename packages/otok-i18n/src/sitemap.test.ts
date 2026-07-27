import { describe, expect, it } from "vitest";
import { createLocalizedSitemapEntries, renderSitemapXml } from "./sitemap.js";

describe("sitemap", () => {
  it("creates localized entries with alternates", () => {
    const entries = createLocalizedSitemapEntries(["/products", "/about"], {
      origin: "https://example.com",
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      routing: "prefix-except-default",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.loc).toBe("https://example.com/products");
    expect(entries[0]?.alternates).toHaveLength(4);
    expect(entries[0]?.alternates.some((a) => a.hreflang === "x-default")).toBe(true);
  });

  it("renders valid sitemap XML", () => {
    const entries = createLocalizedSitemapEntries(["/"], {
      origin: "https://example.com",
      locales: ["de", "en"],
      defaultLocale: "de",
    });
    const xml = renderSitemapXml(entries);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("xhtml:link");
    expect(xml).toContain("https://example.com/");
    expect(xml).toContain("https://example.com/en");
  });
});
