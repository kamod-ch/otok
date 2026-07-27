import { describe, expect, it } from "vitest";
import { createTranslator } from "./catalog.js";
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

describe("createTranslator", () => {
  it("falls back: locale → defaultLocale → explicit → key", () => {
    const tDe = createTranslator(catalog, "de", "en");
    expect(tDe("about.title")).toBe("Über uns");
    expect(tDe("nav.home")).toBe("Home");
    expect(tDe("missing.key", "Fallback")).toBe("Fallback");
    expect(tDe("missing.key")).toBe("missing.key");
  });
});

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
    expect(i18n.source).toBe("param");
    expect(i18n.t("about.title")).toBe("Über uns");
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
    expect(localizePath("/about", "en", { defaultLocale: "en", prefixDefault: true })).toBe("/en/about");
    expect(localizePath("/", "de")).toBe("/de");
  });
});

describe("i18nHead", () => {
  it("sets lang and merges extras", () => {
    expect(i18nHead("de", { title: "Über uns" })).toEqual({
      title: "Über uns",
      lang: "de",
    });
  });
});
