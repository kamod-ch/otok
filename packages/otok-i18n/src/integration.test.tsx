import { describe, expect, it } from "vitest";
import { renderParsedRoute, createTestApp, createTestRoute } from "@kamod-ch/otok-test";
import { defineMiddleware } from "otok/server";
import { createI18nMiddleware, readI18n, toRouteMiddleware } from "./middleware.js";
import { i18nHead } from "./head.js";
import { defineLoader } from "./loader.js";
import { renderToString } from "preact-render-to-string";
import { h } from "preact";
import { I18nProvider, useI18n } from "./client.js";
import type { I18nClientPayload } from "./types.js";

const catalog = {
  de: { "page.title": "Startseite" },
  en: { "page.title": "Home" },
  fr: { "page.title": "Accueil" },
} as const;

const i18nConfig = {
  catalog,
  locales: ["de", "en", "fr"] as const,
  defaultLocale: "de" as const,
  fallbackLocale: "en" as const,
  routing: "prefix-except-default" as const,
};

const i18nMiddleware = toRouteMiddleware(createI18nMiddleware(i18nConfig));

function WelcomeIsland() {
  const { t, formatCurrency, locale } = useI18n();
  return h("div", { "data-testid": "welcome" }, [
    h("h1", null, t("page.title")),
    h("p", { "data-locale": locale }, formatCurrency(29, "CHF")),
  ]);
}

describe("SSR + hydration payload", () => {
  it("renders identical locale and messages on server and client", async () => {
    const loader = defineLoader(({ i18n, hono }) => ({
      i18n: serializeForTest(hono, i18n.toClientPayload()),
      pathname: "/dashboard",
    }));

    const { html, response } = await renderParsedRoute(
      createTestApp({
        routes: [
          createTestRoute({
            path: "/:lang/dashboard",
            pattern: /^\/(?:(de|en|fr)\/)?dashboard\/?$/,
            params: ["lang"],
            middleware: [i18nMiddleware],
            loader,
            module: {
              default: ((props: { data: { i18n: I18nClientPayload } }) =>
                h(I18nProvider, props.data.i18n, h(WelcomeIsland, null))) as never,
              head: ((props: { data: { i18n: I18nClientPayload } }) =>
                i18nHead({
                  locale: props.data.i18n.locale,
                  locales: i18nConfig.locales,
                  defaultLocale: "de",
                  pathname: "/dashboard",
                  origin: "https://example.com",
                  extra: { title: props.data.i18n.messages["page.title"] },
                })) as never,
            },
          }),
        ],
      }),
      "/en/dashboard",
    );

    expect(response.status).toBe(200);
    expect(html).toContain('lang="en"');
    expect(html).toContain("Home");
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('rel="canonical"');

    const payload: I18nClientPayload = {
      locale: "en",
      defaultLocale: "de",
      fallbackLocale: "en",
      messages: { ...catalog.en },
      routing: "prefix-except-default",
    };

    const serverRender = renderToString(h(I18nProvider, payload, h(WelcomeIsland, null)));
    expect(serverRender).toContain("Home");
    expect(serverRender).toContain('data-locale="en"');
  });
});

describe("middleware locale consistency", () => {
  it("keeps locale context across nested middleware", async () => {
    const app = createTestApp({
      routes: [
        createTestRoute({
          path: "/:lang/page",
          pattern: /^\/(?:(de|en|fr)\/)?page\/?$/,
          params: ["lang"],
          middleware: [
            i18nMiddleware,
            toRouteMiddleware(
              defineMiddleware(async (c, next) => {
                c.header("x-locale", readI18n(c)?.locale ?? "missing");
                await next();
              }),
            ),
          ],
          loader: defineLoader(({ i18n }) => ({ locale: i18n.locale })),
          module: {
            default: ((props: { data: { locale: string } }) =>
              h("p", { "data-locale": props.data.locale }, props.data.locale)) as never,
          },
        }),
      ],
    });

    const de = await app.request("/page");
    expect(de.headers.get("x-locale")).toBe("de");

    const fr = await app.request("/fr/page");
    expect(fr.headers.get("x-locale")).toBe("fr");
  });
});

describe("fallback locale", () => {
  it("uses fallback locale for missing keys", async () => {
    const partialCatalog = {
      de: { "only.de": "Nur DE" },
      en: { "only.de": "Only EN", shared: "Shared" },
      fr: {},
    } as const;

    const { html } = await renderParsedRoute(
      createTestApp({
        routes: [
          createTestRoute({
            path: "/:lang/",
            pattern: /^\/(?:(de|en|fr)\/)?\/?$/,
            params: ["lang"],
            middleware: [
              toRouteMiddleware(
                createI18nMiddleware({
                  catalog: partialCatalog,
                  locales: ["de", "en", "fr"],
                  defaultLocale: "de",
                  fallbackLocale: "en",
                }),
              ),
            ],
            loader: defineLoader(({ i18n }) => ({
              text: i18n.t("shared"),
              missing: i18n.t("only.de"),
            })),
            module: {
              default: ((props: { data: { text: string; missing: string } }) =>
                h("div", null, [
                  h("span", { "data-shared": true }, props.data.text),
                  h("span", { "data-missing": true }, props.data.missing),
                ])) as never,
            },
          }),
        ],
      }),
      "/fr/",
    );

    expect(html).toContain("Shared");
    expect(html).toContain("Only EN");
  });
});

function serializeForTest(
  _hono: unknown,
  payload: I18nClientPayload,
): { locale: string; defaultLocale: string; fallbackLocale: string; messages: Record<string, string>; routing: string } {
  return {
    locale: payload.locale,
    defaultLocale: payload.defaultLocale,
    fallbackLocale: payload.fallbackLocale,
    messages: payload.messages,
    routing: payload.routing,
  };
}
