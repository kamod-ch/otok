import { describe, expect, it } from "vitest";
import {
  matchLocale,
  parseAcceptLanguage,
  resolveLocale,
  resolveLocaleFull,
  resolveLocaleFromDomain,
  stripLocaleFromPath,
} from "./locale.js";

const locales = ["de", "en", "fr"] as const;

describe("matchLocale", () => {
  it("matches exact and language-tag fallbacks", () => {
    expect(matchLocale("de", locales)).toBe("de");
    expect(matchLocale("DE", locales)).toBe("de");
    expect(matchLocale("de-CH", locales)).toBe("de");
    expect(matchLocale("xx", locales)).toBeUndefined();
  });
});

describe("parseAcceptLanguage", () => {
  it("picks the highest-q supported locale", () => {
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7", locales)).toBe("fr");
    expect(parseAcceptLanguage("de-DE,de;q=0.9,en;q=0.8", locales)).toBe("de");
    expect(parseAcceptLanguage("en-US,en;q=0.9", locales)).toBe("en");
    expect(parseAcceptLanguage("ja;q=0.9", locales)).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("prefers url over cookie over header over default", () => {
    expect(
      resolveLocale({
        param: "de",
        cookie: "en",
        acceptLanguage: "en",
        locales,
        defaultLocale: "de",
      }),
    ).toEqual({ locale: "de", source: "url" });

    expect(
      resolveLocale({
        cookie: "fr",
        acceptLanguage: "en",
        locales,
        defaultLocale: "de",
      }),
    ).toEqual({ locale: "fr", source: "cookie" });

    expect(
      resolveLocale({
        acceptLanguage: "de-DE,de;q=0.9",
        locales,
        defaultLocale: "en",
      }),
    ).toEqual({ locale: "de", source: "header" });

    expect(
      resolveLocale({
        param: "xx",
        cookie: "yy",
        acceptLanguage: "ja",
        locales,
        defaultLocale: "de",
      }),
    ).toEqual({ locale: "de", source: "default" });
  });
});

describe("resolveLocaleFull routing modes", () => {
  const base = {
    hostname: "example.com",
    cookie: undefined,
    acceptLanguage: undefined,
    locales,
    defaultLocale: "de",
  };

  it("prefix: always reads locale from path", () => {
    expect(
      resolveLocaleFull({ ...base, pathname: "/en/products", routing: "prefix" }),
    ).toEqual({
      locale: "en",
      source: "url",
      pathLocale: "en",
      canonicalPathname: "/products",
    });
  });

  it("prefix-except-default: default locale has no prefix", () => {
    expect(
      resolveLocaleFull({ ...base, pathname: "/products", routing: "prefix-except-default" }),
    ).toMatchObject({ locale: "de", canonicalPathname: "/products" });

    expect(
      resolveLocaleFull({ ...base, pathname: "/en/products", routing: "prefix-except-default" }),
    ).toMatchObject({ locale: "en", pathLocale: "en", canonicalPathname: "/products" });
  });

  it("domain: resolves locale from hostname", () => {
    expect(
      resolveLocaleFull({
        ...base,
        pathname: "/products",
        hostname: "example.fr",
        routing: "domain",
        domains: { "example.fr": "fr", "example.com": "de" },
      }),
    ).toEqual({
      locale: "fr",
      source: "domain",
      canonicalPathname: "/products",
    });
  });

  it("none: ignores path prefix", () => {
    expect(
      resolveLocaleFull({ ...base, pathname: "/en/products", routing: "none", cookie: "fr" }),
    ).toMatchObject({ locale: "fr", source: "cookie", canonicalPathname: "/en/products" });
  });

  it("flags unknown locale prefixes", () => {
    expect(
      resolveLocaleFull({ ...base, pathname: "/xx/products", routing: "prefix" }),
    ).toMatchObject({
      unknownPathLocale: "xx",
      canonicalPathname: "/products",
    });
  });
});

describe("resolveLocaleFromDomain", () => {
  it("maps hostnames to locales", () => {
    expect(resolveLocaleFromDomain("example.fr", { "example.fr": "fr" }, locales)).toBe("fr");
    expect(resolveLocaleFromDomain("unknown.com", { "example.fr": "fr" }, locales)).toBeUndefined();
  });
});

describe("stripLocaleFromPath", () => {
  it("strips supported locale segments", () => {
    expect(stripLocaleFromPath("/de/about", locales, "prefix-except-default")).toEqual({
      pathname: "/about",
      locale: "de",
    });
  });
});
