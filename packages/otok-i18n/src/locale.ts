import { matchLocale, normalizeLocale, parseAcceptLanguage } from "./locale-core.js";
import type { ResolveLocaleInput, ResolvedLocaleResult, RoutingMode } from "./types.js";

export { matchLocale, normalizeLocale, parseAcceptLanguage } from "./locale-core.js";

export type LocaleSource = import("./types.js").LocaleSource;

export interface ResolveLocaleOptions {
  param?: string | undefined;
  domain?: string | undefined;
  cookie?: string | undefined;
  acceptLanguage?: string | undefined;
  locales: readonly string[];
  defaultLocale: string;
}

export interface ResolvedLocale {
  locale: string;
  source: LocaleSource;
}

const LOCALE_SEGMENT_RE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function looksLikeLocaleSegment(segment: string): boolean {
  return LOCALE_SEGMENT_RE.test(segment);
}

export function resolveLocaleFromDomain(
  hostname: string,
  domains: Record<string, string> | undefined,
  locales: readonly string[],
): string | undefined {
  if (!domains) return undefined;
  const host = hostname.toLowerCase().split(":")[0] ?? hostname;
  const mapped = domains[host];
  if (mapped) return matchLocale(mapped, locales);
  return undefined;
}

export function stripLocaleFromPath(
  pathname: string,
  locales: readonly string[],
  routing: RoutingMode,
): { pathname: string; locale?: string; unknownLocale?: string } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/" || routing === "none" || routing === "domain") {
    return { pathname: normalized };
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return { pathname: "/" };

  const first = segments[0] ?? "";
  const matched = matchLocale(first, locales);

  if (matched) {
    const rest = segments.slice(1).join("/");
    return {
      pathname: rest ? `/${rest}` : "/",
      locale: matched,
    };
  }

  if (looksLikeLocaleSegment(first)) {
    const rest = segments.slice(1).join("/");
    return {
      pathname: rest ? `/${rest}` : "/",
      unknownLocale: first,
    };
  }

  return { pathname: normalized };
}

/**
 * Full locale resolution with routing-mode awareness.
 *
 * Priority: URL/domain → cookie → Accept-Language → defaultLocale
 */
export function resolveLocaleFull(input: ResolveLocaleInput): ResolvedLocaleResult {
  const { locales, defaultLocale, routing, domains } = input;

  let pathLocale: string | undefined;
  let unknownPathLocale: string | undefined;
  let canonicalPathname = input.pathname;

  if (routing === "domain") {
    const fromDomain = resolveLocaleFromDomain(input.hostname, domains, locales);
    if (fromDomain) {
      const stripped = stripLocaleFromPath(input.pathname, locales, "none");
      return {
        locale: fromDomain,
        source: "domain",
        canonicalPathname: stripped.pathname,
      };
    }
  }

  const stripped = stripLocaleFromPath(input.pathname, locales, routing);
  canonicalPathname = stripped.pathname;
  pathLocale = stripped.locale;
  unknownPathLocale = stripped.unknownLocale;

  if (pathLocale) {
    return { locale: pathLocale, source: "url", pathLocale, canonicalPathname };
  }

  if (unknownPathLocale) {
    const fallback = matchLocale(defaultLocale, locales) ?? defaultLocale;
    return {
      locale: fallback,
      source: "default",
      unknownPathLocale,
      canonicalPathname,
    };
  }

  const fromCookie = matchLocale(input.cookie, locales);
  if (fromCookie) {
    return { locale: fromCookie, source: "cookie", canonicalPathname };
  }

  const fromHeader = parseAcceptLanguage(input.acceptLanguage, locales);
  if (fromHeader) {
    return { locale: fromHeader, source: "header", canonicalPathname };
  }

  const fallback = matchLocale(defaultLocale, locales) ?? defaultLocale;
  return { locale: fallback, source: "default", canonicalPathname };
}

/** Legacy simple resolver (param → cookie → header → default). */
export function resolveLocale(options: ResolveLocaleOptions): ResolvedLocale {
  const { locales, defaultLocale } = options;

  const fromParam = matchLocale(options.param, locales);
  if (fromParam) return { locale: fromParam, source: "url" };

  const fromDomain = matchLocale(options.domain, locales);
  if (fromDomain) return { locale: fromDomain, source: "domain" };

  const fromCookie = matchLocale(options.cookie, locales);
  if (fromCookie) return { locale: fromCookie, source: "cookie" };

  const fromHeader = parseAcceptLanguage(options.acceptLanguage, locales);
  if (fromHeader) return { locale: fromHeader, source: "header" };

  const fallback = matchLocale(defaultLocale, locales) ?? defaultLocale;
  return { locale: fallback, source: "default" };
}

export const DEFAULT_PARAM_KEY = "lang";
export const DEFAULT_COOKIE_NAME = "locale";
