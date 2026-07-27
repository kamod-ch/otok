import { describe, expect, it } from "vitest";
import { createI18n } from "./i18n.js";
import { i18nHead } from "./head.js";
import { localizePath, stripLocaleParam, withLocaleParam } from "./routes.js";

const catalog = {
  en: {
    "about.title": "About",
    "nav.home": "Home",
  },
  de: {
    "about.title": "Über uns",
  },
} as const;

describe("createI18n", () => {
  it("builds a typed context from config + input", () => {
    const i18n = createI18n(
      {
        catalog,
        locales: ["en", "de"],
        defaultLocale: "en",
      },
      { param: "de" },
    );
    expect(i18n.locale).toBe("de");
    expect(i18n.source).toBe("url");
    expect(i18n.t("about.title")).toBe("Über uns");
    expect(i18n.toClientPayload().messages).toEqual(catalog.de);
  });
});

describe("route helpers", () => {
  it("withLocaleParam merges the locale param", () => {
    expect(withLocaleParam({ id: "1" }, "de")).toEqual({ id: "1", lang: "de" });
    expect(withLocaleParam({}, "en", "locale")).toEqual({ locale: "en" });
  });

  it("stripLocaleParam removes a leading locale segment", () => {
    expect(stripLocaleParam("/de/about", ["en", "de"])).toEqual({
      pathname: "/about",
      locale: "de",
    });
    expect(stripLocaleParam("/about", ["en", "de"])).toEqual({ pathname: "/about" });
    expect(stripLocaleParam("/de", ["en", "de"])).toEqual({ pathname: "/", locale: "de" });
  });

  it("localizePath prefixes non-default locales", () => {
    expect(localizePath("/about", "de")).toBe("/de/about");
    expect(localizePath("/about", "en", { defaultLocale: "en" })).toBe("/about");
    expect(localizePath("/about", "en", { defaultLocale: "en", routing: "prefix" })).toBe("/en/about");
    expect(localizePath("/", "de")).toBe("/de");
  });
});

describe("i18nHead", () => {
  it("sets lang with legacy signature", () => {
    expect(i18nHead("de", { title: "Über uns" })).toEqual({
      title: "Über uns",
      lang: "de",
    });
  });

  it("adds canonical and hreflang links", () => {
    const head = i18nHead({
      locale: "de",
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      origin: "https://example.com",
      pathname: "/products",
      extra: { title: "Products" },
    });

    expect(head.lang).toBe("de");
    expect(head.links?.some((l) => l.rel === "canonical")).toBe(true);
    expect(head.links?.filter((l) => l.rel === "alternate")).toHaveLength(4);
  });
});
