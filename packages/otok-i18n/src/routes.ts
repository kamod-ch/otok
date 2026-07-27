import { matchLocale, normalizeLocale } from "./locale-core.js";
import type { LocalizedRouteNames, RoutingMode } from "./types.js";

export const DEFAULT_PARAM_KEY = "lang";

export interface LocalizePathOptions {
  defaultLocale?: string;
  routing?: RoutingMode;
}

export function withLocaleParam(
  params: Record<string, string | undefined>,
  locale: string,
  paramKey = DEFAULT_PARAM_KEY,
): Record<string, string | undefined> {
  return { ...params, [paramKey]: locale };
}

export function stripLocaleParam(
  pathname: string,
  locales: readonly string[],
  _paramKey = DEFAULT_PARAM_KEY,
): { pathname: string; locale?: string } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") return { pathname: "/" };

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return { pathname: "/" };

  const first = segments[0] ?? "";
  const matched = matchLocale(first, locales);
  if (!matched) return { pathname: normalized };

  const rest = segments.slice(1).join("/");
  return {
    pathname: rest ? `/${rest}` : "/",
    locale: matched,
  };
}

/**
 * Build a localized pathname according to the routing mode.
 */
export function localizePath(
  pathname: string,
  locale: string,
  options: LocalizePathOptions = {},
): string {
  const { defaultLocale, routing = "prefix-except-default" } = options;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localeNorm = normalizeLocale(locale) ?? locale;

  if (routing === "none" || routing === "domain") {
    return normalized === "" ? "/" : normalized;
  }

  if (routing === "prefix-except-default" && defaultLocale != null) {
    const defaultNorm = normalizeLocale(defaultLocale) ?? defaultLocale;
    if (localeNorm === defaultNorm) return normalized === "" ? "/" : normalized;
  }

  if (normalized === "/") return `/${localeNorm}`;
  return `/${localeNorm}${normalized}`;
}

/**
 * Switch locale while preserving the current canonical path.
 */
export function switchLocalePath(
  currentPathname: string,
  targetLocale: string,
  locales: readonly string[],
  options: LocalizePathOptions = {},
): string {
  const { pathname } = stripLocaleParam(currentPathname, locales);
  return localizePath(pathname, targetLocale, options);
}

export function localizeRouteSegment(
  routeKey: string,
  locale: string,
  routeNames: LocalizedRouteNames,
  fallbackLocale: string,
): string {
  const names = routeNames[routeKey];
  if (!names) return routeKey;
  return names[locale] ?? names[fallbackLocale] ?? routeKey;
}

export function createLinkHelper(
  locales: readonly string[],
  defaultLocale: string,
  routing: RoutingMode,
  routeNames: LocalizedRouteNames = {},
) {
  return {
    href(pathname: string, locale: string): string {
      return localizePath(pathname, locale, { defaultLocale, routing });
    },
    switchLocale(currentPathname: string, targetLocale: string): string {
      return switchLocalePath(currentPathname, targetLocale, locales, { defaultLocale, routing });
    },
    route(routeKey: string, locale: string): string {
      const segment = localizeRouteSegment(routeKey, locale, routeNames, defaultLocale);
      return localizePath(`/${segment}`, locale, { defaultLocale, routing });
    },
  };
}
