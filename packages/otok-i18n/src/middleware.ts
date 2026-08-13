import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { defineMiddleware, type MiddlewareModule, type OtokMiddleware } from "@kamod-ch/otok/server";
import type { MessageCatalog } from "./catalog.js";
import { buildI18nContext, createI18nAsync } from "./i18n.js";
import { DEFAULT_COOKIE_NAME, resolveLocaleFull } from "./locale.js";
import { localizePath } from "./routes.js";
import type { I18nConfig, I18nContext, I18nPluginOptions } from "./types.js";
import {
  getI18nRuntime,
  normalizePluginOptions,
  registerI18nRuntime,
  type NormalizedI18nOptions,
} from "./registry.js";
import { clearMessageCache } from "./messages.js";

async function buildPluginContext(
  c: Context,
  options: NormalizedI18nOptions,
): Promise<{ i18n: I18nContext; redirect?: Response }> {
  const url = new URL(c.req.url);

  const resolved = resolveLocaleFull({
    pathname: url.pathname,
    hostname: url.hostname,
    cookie: getCookie(c, options.cookieName),
    acceptLanguage: c.req.header("accept-language") ?? undefined,
    locales: options.locales,
    defaultLocale: options.defaultLocale,
    routing: options.routing,
    domains: options.domains,
  });

  if (options.redirectUnknownLocale && resolved.unknownPathLocale) {
    const target = localizePath(resolved.canonicalPathname, resolved.locale, {
      defaultLocale: options.defaultLocale,
      routing: options.routing,
    });
    const location = `${target}${url.search}`;
    if (location !== `${url.pathname}${url.search}`) {
      return { i18n: {} as I18nContext, redirect: c.redirect(location, 307) };
    }
  }

  const i18n = await createI18nAsync(options, {
    pathname: url.pathname,
    hostname: url.hostname,
    cookie: getCookie(c, options.cookieName),
    acceptLanguage: c.req.header("accept-language") ?? undefined,
    locales: options.locales,
    defaultLocale: options.defaultLocale,
    routing: options.routing,
    domains: options.domains,
  });

  return { i18n };
}

function persistLocaleCookie(c: Context, options: NormalizedI18nOptions, locale: string): void {
  if (!options.persistLocale) return;
  const current = getCookie(c, options.cookieName);
  if (current === locale) return;
  setCookie(c, options.cookieName, locale, {
    path: "/",
    maxAge: options.cookieMaxAge,
    sameSite: "Lax",
    httpOnly: false,
  });
}

/** Wrap middleware for Otok route `middleware` arrays (requires `{ default }` export shape). */
export function toRouteMiddleware(middleware: OtokMiddleware): MiddlewareModule {
  return { default: middleware };
}

/** App-level middleware used by the i18n() plugin. */
export function createI18nPluginMiddleware(options: NormalizedI18nOptions): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const { i18n, redirect } = await buildPluginContext(c, options);
    if (redirect) return redirect;

    c.set(options.contextKey, i18n);
    persistLocaleCookie(c, options, i18n.locale);

    registerI18nRuntime({
      options,
      getContext: () => i18n,
    });

    await next();
  });
}

/** Route-level middleware for legacy flat-catalog config. */
export function createI18nMiddleware<Catalog extends MessageCatalog>(
  config: I18nConfig<Catalog>,
): OtokMiddleware {
  const cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
  const contextKey = config.contextKey ?? "i18n";
  const routing = config.routing ?? "prefix-except-default";
  const fallbackLocale = (config.fallbackLocale ?? config.defaultLocale) as string;

  return defineMiddleware(async (c, next) => {
    const url = new URL(c.req.url);
    const resolved = resolveLocaleFull({
      pathname: url.pathname,
      hostname: url.hostname,
      cookie: getCookie(c, cookieName),
      acceptLanguage: c.req.header("accept-language") ?? undefined,
      locales: config.locales,
      defaultLocale: config.defaultLocale,
      routing,
      domains: config.domains as Record<string, string> | undefined,
    });

    const locale = config.locales.includes(resolved.locale as keyof Catalog & string)
      ? resolved.locale
      : config.defaultLocale;

    const messages = config.catalog[locale as keyof Catalog & string] ?? {};
    const fallbackMessages = config.catalog[fallbackLocale as keyof Catalog & string] ?? {};

    const i18n = buildI18nContext({
      locale: locale as string,
      source: resolved.source,
      routing,
      defaultLocale: config.defaultLocale,
      fallbackLocale,
      messages,
      fallbackMessages,
    });

    c.set(contextKey, i18n);
    await next();
  });
}

export function readI18n<Catalog extends MessageCatalog = MessageCatalog>(
  c: Context,
  contextKey = "i18n",
): I18nContext | undefined {
  return c.get(contextKey) as I18nContext | undefined;
}

/** Configure i18n on a Hono app (used by plugin and manual setup). */
export function configureI18nApp(
  app: import("hono").Hono,
  pluginOptions: I18nPluginOptions,
): NormalizedI18nOptions {
  clearMessageCache();
  const options = normalizePluginOptions(pluginOptions);
  app.use("*", createI18nPluginMiddleware(options));
  return options;
}

export { clearMessageCache };
