import { describe, expect, it } from "vitest";
import { pageHtml } from "./html.js";
import { resolveDarkModeFromCookie } from "../shared/theme.js";

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
  it("includes blocking theme script on every page", () => {
    const html = pageHtml({ body: "<main>Hi</main>", islands: [] });
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
