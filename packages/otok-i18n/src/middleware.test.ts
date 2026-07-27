import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { clearMessageCache } from "./messages.js";
import { configureI18nApp, createI18nMiddleware, readI18n } from "./middleware.js";
import i18n from "./plugin.js";

const catalog = {
  en: { hello: "Hello", "dashboard.welcome": "Welcome" },
  de: { hello: "Hallo", "dashboard.welcome": "Willkommen" },
  fr: { hello: "Bonjour", "dashboard.welcome": "Bienvenue" },
} as const;

const legacyConfig = {
  catalog,
  locales: ["en", "de", "fr"] as const,
  defaultLocale: "de" as const,
  fallbackLocale: "en" as const,
  routing: "prefix-except-default" as const,
  cookieName: "locale",
  contextKey: "i18n",
};

describe("createI18nMiddleware", () => {
  it("stores resolved i18n on the Hono context from the path", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(legacyConfig));
    app.get("*", (c) => {
      const ctx = readI18n(c);
      return c.json({
        locale: ctx?.locale,
        source: ctx?.source,
        hello: ctx?.t("hello"),
      });
    });

    const de = await app.request("/de/about");
    expect(await de.json()).toEqual({ locale: "de", source: "url", hello: "Hallo" });

    const defaultDe = await app.request("/about");
    expect(await defaultDe.json()).toEqual({ locale: "de", source: "default", hello: "Hallo" });
  });

  it("uses cookie when path has no locale", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(legacyConfig));
    app.get("*", (c) => {
      const ctx = readI18n(c);
      return c.json({ locale: ctx?.locale, source: ctx?.source });
    });

    const response = await app.request("/about", {
      headers: { cookie: "locale=en" },
    });
    expect(await response.json()).toEqual({ locale: "en", source: "cookie" });
  });

  it("uses Accept-Language when path and cookie are absent", async () => {
    const app = new Hono();
    app.use("*", createI18nMiddleware(legacyConfig));
    app.get("*", (c) => {
      const ctx = readI18n(c);
      return c.json({ locale: ctx?.locale, source: ctx?.source });
    });

    const response = await app.request("/about", {
      headers: { "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" },
    });
    expect(await response.json()).toEqual({ locale: "fr", source: "header" });
  });
});

describe("i18n() plugin middleware", () => {
  beforeEach(() => {
    clearMessageCache();
  });

  const messages = {
    de: () => catalog.de,
    en: () => catalog.en,
    fr: () => catalog.fr,
  };

  function createPluginApp() {
    const app = new Hono();
    configureI18nApp(app, {
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      fallbackLocale: "en",
      routing: "prefix-except-default",
      messages,
      persistLocale: true,
    });
    app.get("*", (c) => {
      const ctx = readI18n(c)!;
      return c.json({
        locale: ctx.locale,
        source: ctx.source,
        welcome: ctx.t("dashboard.welcome"),
        payload: ctx.toClientPayload(),
      });
    });
    return app;
  }

  it("loads messages lazily per locale", async () => {
    const app = createPluginApp();
    const fr = await app.request("/fr/dashboard");
    const body = await fr.json();
    expect(body.locale).toBe("fr");
    expect(body.welcome).toBe("Bienvenue");
    expect(body.payload.messages.hello).toBe("Bonjour");
    expect(body.payload.messages).not.toHaveProperty("de");
  });

  it("redirects unknown locale prefixes", async () => {
    const app = createPluginApp();
    const response = await app.request("/xx/products", { redirect: "manual" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/products");
  });

  it("sets locale cookie", async () => {
    const app = createPluginApp();
    const response = await app.request("/en/about");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("locale=en");
  });
});

describe("prefix routing mode", () => {
  it("requires locale prefix for default locale", async () => {
    const app = new Hono();
    app.use(
      "*",
      createI18nMiddleware({
        ...legacyConfig,
        routing: "prefix",
        defaultLocale: "de",
      }),
    );
    app.get("*", (c) => c.json({ locale: readI18n(c)?.locale }));

    const bare = await app.request("/products");
    expect((await bare.json()).locale).toBe("de");

    const prefixed = await app.request("/de/products");
    expect((await prefixed.json()).locale).toBe("de");
  });
});

describe("domain routing mode", () => {
  it("resolves locale from hostname", async () => {
    const app = new Hono();
    app.use(
      "*",
      createI18nMiddleware({
        ...legacyConfig,
        routing: "domain",
        domains: { "example.fr": "fr" },
      }),
    );
    app.get("*", (c) => c.json({ locale: readI18n(c)?.locale, source: readI18n(c)?.source }));

    const response = await app.request("http://example.fr/products");
    expect(await response.json()).toEqual({ locale: "fr", source: "domain" });
  });
});
