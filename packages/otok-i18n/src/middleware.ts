import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { defineMiddleware, type OtokMiddleware } from "otok/server";
import type { MessageCatalog } from "./catalog.js";
import { createI18n, type I18nConfig, type I18nContext } from "./i18n.js";
import { DEFAULT_COOKIE_NAME, DEFAULT_PARAM_KEY } from "./locale.js";
import { stripLocaleParam } from "./routes.js";

export function createI18nMiddleware<Catalog extends MessageCatalog>(
  config: I18nConfig<Catalog>,
): OtokMiddleware {
  const cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
  const contextKey = config.contextKey ?? "i18n";
  const paramKey = config.paramKey ?? DEFAULT_PARAM_KEY;

  return defineMiddleware(async (c, next) => {
    const url = new URL(c.req.url);
    const fromPath = stripLocaleParam(url.pathname, config.locales, paramKey);
    const cookie = getCookie(c, cookieName);
    const acceptLanguage = c.req.header("accept-language") ?? undefined;

    const i18n = createI18n(config, {
      param: fromPath.locale,
      cookie,
      acceptLanguage,
    });

    c.set(contextKey, i18n);
    await next();
  });
}

export function readI18n<Catalog extends MessageCatalog = MessageCatalog>(
  c: Context,
  contextKey = "i18n",
): I18nContext<Catalog> | undefined {
  return c.get(contextKey) as I18nContext<Catalog> | undefined;
}
