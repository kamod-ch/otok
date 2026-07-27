import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createI18nMiddleware, readI18n } from "./middleware.js";

const catalog = {
  en: { hello: "Hello" },
  de: { hello: "Hallo" },
} as const;

const config = {
  catalog,
  locales: ["en", "de"] as const,
  defaultLocale: "en" as const,
  cookieName: "locale",
  contextKey: "i18n",
};

describe("createI18nMiddleware", () => {
  it("stores resolved i18n on the Hono context from the path", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(config));
    app.get("*", (c) => {
      const i18n = readI18n(c);
      return c.json({
        locale: i18n?.locale,
        source: i18n?.source,
        hello: i18n?.t("hello"),
      });
    });

    const de = await app.request("/de/about");
    expect(await de.json()).toEqual({ locale: "de", source: "param", hello: "Hallo" });

    const en = await app.request("/about");
    expect(await en.json()).toEqual({ locale: "en", source: "default", hello: "Hello" });
  });

  it("uses cookie when path has no locale", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(config));
    app.get("*", (c) => {
      const i18n = readI18n(c);
      return c.json({ locale: i18n?.locale, source: i18n?.source });
    });

    const response = await app.request("/about", {
      headers: { cookie: "locale=de" },
    });
    expect(await response.json()).toEqual({ locale: "de", source: "cookie" });
  });

  it("uses Accept-Language when path and cookie are absent", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(config));
    app.get("*", (c) => {
      const i18n = readI18n(c);
      return c.json({ locale: i18n?.locale, source: i18n?.source });
    });

    const response = await app.request("/about", {
      headers: { "accept-language": "de-CH,de;q=0.9,en;q=0.8" },
    });
    expect(await response.json()).toEqual({ locale: "de", source: "header" });
  });
});
