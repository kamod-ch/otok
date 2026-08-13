import type { OtokHead, OtokHeadLink } from "@kamod-ch/otok/server";
import { localizePath } from "./routes.js";
import type { RoutingMode } from "./types.js";

export interface I18nHeadOptions {
  locale: string;
  locales: readonly string[];
  defaultLocale: string;
  routing?: RoutingMode;
  /** Absolute site origin, e.g. `https://example.com` */
  origin?: string;
  /** Canonical pathname without locale prefix */
  pathname?: string;
  extra?: OtokHead;
}

/** Merge `lang` and optional hreflang / canonical links into an Otok head result. */
export function i18nHead(options: I18nHeadOptions): OtokHead;
/** @deprecated Pass an options object for hreflang support. */
export function i18nHead(locale: string, extra?: OtokHead): OtokHead;
export function i18nHead(
  localeOrOptions: string | I18nHeadOptions,
  extra: OtokHead = {},
): OtokHead {
  if (typeof localeOrOptions === "string") {
    return { ...extra, lang: localeOrOptions };
  }

  const {
    locale,
    locales,
    defaultLocale,
    routing = "prefix-except-default",
    origin,
    pathname = "/",
    extra: headExtra = {},
  } = localeOrOptions;

  const links: OtokHeadLink[] = [...(headExtra.links ?? [])];

  if (origin) {
    const canonicalHref = `${origin.replace(/\/$/, "")}${localizePath(pathname, locale, { defaultLocale, routing })}`;
    if (!links.some((l) => l.rel === "canonical")) {
      links.push({ rel: "canonical", href: canonicalHref });
    }

    for (const altLocale of locales) {
      const href = `${origin.replace(/\/$/, "")}${localizePath(pathname, altLocale, { defaultLocale, routing })}`;
      links.push({
        rel: "alternate",
        href,
        hreflang: altLocale,
      });
    }
    links.push({
      rel: "alternate",
      href: `${origin.replace(/\/$/, "")}${localizePath(pathname, defaultLocale, { defaultLocale, routing })}`,
      hreflang: "x-default",
    });
  }

  return {
    ...headExtra,
    lang: locale,
    links,
  };
}
