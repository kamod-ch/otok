import { describe, expect, it } from "vitest";
import {
  matchLocale,
  parseAcceptLanguage,
  resolveLocale,
} from "./locale.js";

const locales = ["en", "de"] as const;

describe("matchLocale", () => {
  it("matches exact and language-tag fallbacks", () => {
    expect(matchLocale("de", locales)).toBe("de");
    expect(matchLocale("DE", locales)).toBe("de");
    expect(matchLocale("de-CH", locales)).toBe("de");
    expect(matchLocale("fr", locales)).toBeUndefined();
  });
});

describe("parseAcceptLanguage", () => {
  it("picks the highest-q supported locale", () => {
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7", locales)).toBe("de");
    expect(parseAcceptLanguage("en-US,en;q=0.9", locales)).toBe("en");
    expect(parseAcceptLanguage("fr;q=0.9", locales)).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("prefers param over cookie over header over default", () => {
    expect(
      resolveLocale({
        param: "de",
        cookie: "en",
        acceptLanguage: "en",
        locales,
        defaultLocale: "en",
      }),
    ).toEqual({ locale: "de", source: "param" });

    expect(
      resolveLocale({
        cookie: "de",
        acceptLanguage: "en",
        locales,
        defaultLocale: "en",
      }),
    ).toEqual({ locale: "de", source: "cookie" });

    expect(
      resolveLocale({
        acceptLanguage: "de-DE,de;q=0.9",
        locales,
        defaultLocale: "en",
      }),
    ).toEqual({ locale: "de", source: "header" });

    expect(
      resolveLocale({
        param: "fr",
        cookie: "xx",
        acceptLanguage: "fr",
        locales,
        defaultLocale: "en",
      }),
    ).toEqual({ locale: "en", source: "default" });
  });
});
