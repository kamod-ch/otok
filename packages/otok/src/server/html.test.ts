import { describe, expect, it } from "vitest";
import { pageHtml } from "./html.js";
import { resolveDarkModeFromCookie } from "../shared/theme.js";
import { OTOK_HEAD_ATTR } from "../shared/navigation.js";

describe("resolveDarkModeFromCookie", () => {
  it("returns true when the theme cookie is dark", () => {
    expect(resolveDarkModeFromCookie("theme=dark")).toBe(true);
    expect(resolveDarkModeFromCookie("foo=bar; theme=dark; baz=qux")).toBe(true);
  });

  it("returns false for light or missing theme cookies", () => {
    expect(resolveDarkModeFromCookie("theme=light")).toBe(false);
    expect(resolveDarkModeFromCookie(undefined)).toBe(false);
    expect(resolveDarkModeFromCookie("other=value")).toBe(false);
  });
});

describe("pageHtml theme bootstrap", () => {
  it("omits theme script by default", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [] });
    expect(html).not.toContain('localStorage.getItem("theme")');
    expect(html).not.toContain("html.dark{color-scheme:dark}");
  });

  it("includes blocking theme script when theme is enabled", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [], theme: true });
    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain("html.dark{color-scheme:dark}");
  });

  it("renders dark html class when darkMode is true", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [], darkMode: true });
    expect(html).toContain('<html lang="en" class="dark">');
  });

  it("omits dark html class by default", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [] });
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain('<html lang="en" class="dark">');
  });
});

describe("pageHtml stylesheets", () => {
  it("emits dev stylesheets before the body when no manifest is available", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [], devStylesheets: ["/src/style.css"] });

    expect(html).toContain('<link rel="stylesheet" href="/src/style.css">');
    expect(html.indexOf('<link rel="stylesheet" href="/src/style.css">')).toBeLessThan(html.indexOf("<body>"));
  });

  it("prefers manifest css over dev stylesheets in production", () => {
    const html = pageHtml({
      body: "<main>Hi</main>",
      islands: [],
      manifest: { "src/client.ts": { file: "assets/client.js", css: ["assets/client.css"], isEntry: true } },
      devStylesheets: ["/src/style.css"],
    });

    expect(html).toContain('<link rel="stylesheet" href="/assets/client.css">');
    expect(html).not.toContain("/src/style.css");
  });
});

describe("pageHtml soft-nav head markers", () => {
  it("marks description, meta, canonical, and json-ld for head sync", () => {
    const html = pageHtml({
      body: "<main>Hi</main>",
      islands: [],
      head: {
        title: "Dashboard",
        description: "Server-rendered dashboard",
        meta: { "og:type": "website" },
        links: [{ rel: "canonical", href: "https://example.com/" }],
        jsonLd: { "@type": "SoftwareApplication", name: "Otok" },
      },
    });

    expect(html).toContain(`${OTOK_HEAD_ATTR}="title"`);
    expect(html).toContain(`${OTOK_HEAD_ATTR}="description"`);
    expect(html).toContain(`${OTOK_HEAD_ATTR}="og:type"`);
    expect(html).toContain(`${OTOK_HEAD_ATTR}="canonical"`);
    expect(html).toContain(`${OTOK_HEAD_ATTR}="json-ld"`);
  });
});
