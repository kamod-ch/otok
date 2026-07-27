import { matchLocale, normalizeLocale } from "./locale.js";

const DEFAULT_PARAM_KEY = "lang";

export function withLocaleParam(
  params: Record<string, string | undefined>,
  locale: string,
  paramKey = DEFAULT_PARAM_KEY,
): Record<string, string | undefined> {
  return { ...params, [paramKey]: locale };
}

/**
 * If the first path segment is a supported locale, strip it and return the remainder.
 */
export function stripLocaleParam(
  pathname: string,
  locales: readonly string[],
  _paramKey = DEFAULT_PARAM_KEY,
): { pathname: string; locale?: string } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") return { pathname: "/" };

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return { pathname: "/" };

  const first = segments[0];
  const matched = matchLocale(first, locales);
  if (!matched) return { pathname: normalized };

  const rest = segments.slice(1).join("/");
  return {
    pathname: rest ? `/${rest}` : "/",
    locale: matched,
  };
}

export interface LocalizePathOptions {
  /** When `locale` equals this value and `prefixDefault` is false, omit the prefix. */
  defaultLocale?: string;
  /** Prefix the default locale as well. Default: false. */
  prefixDefault?: boolean;
}

/**
 * Prefix a pathname with a locale segment.
 * `localizePath("/about", "de")` → `"/de/about"`
 * `localizePath("/about", "en", { defaultLocale: "en" })` → `"/about"`
 */
export function localizePath(
  pathname: string,
  locale: string,
  options: LocalizePathOptions = {},
): string {
  const { defaultLocale, prefixDefault = false } = options;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localeNorm = normalizeLocale(locale) ?? locale;

  if (defaultLocale != null && !prefixDefault) {
    const defaultNorm = normalizeLocale(defaultLocale) ?? defaultLocale;
    if (localeNorm === defaultNorm) return normalized === "" ? "/" : normalized;
  }

  if (normalized === "/") return `/${localeNorm}`;
  return `/${localeNorm}${normalized}`;
}
