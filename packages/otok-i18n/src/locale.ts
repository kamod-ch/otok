export type LocaleSource = "param" | "cookie" | "header" | "default";

export interface ResolveLocaleOptions {
  /** Locale from a route param such as `[[lang]]`. */
  param?: string | undefined;
  paramKey?: string;
  cookie?: string | undefined;
  cookieName?: string;
  acceptLanguage?: string | undefined;
  locales: readonly string[];
  defaultLocale: string;
}

export interface ResolvedLocale {
  locale: string;
  source: LocaleSource;
}

const DEFAULT_PARAM_KEY = "lang";
const DEFAULT_COOKIE_NAME = "locale";

export function normalizeLocale(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Match a BCP 47 tag against supported locales.
 * Tries exact match first, then the primary language subtag (`de-CH` → `de`).
 */
export function matchLocale(candidate: string | undefined, locales: readonly string[]): string | undefined {
  const normalized = normalizeLocale(candidate);
  if (!normalized) return undefined;

  const exact = locales.find((locale) => normalizeLocale(locale) === normalized);
  if (exact) return exact;

  const primary = normalized.split("-")[0];
  if (!primary || primary === normalized) return undefined;
  return locales.find((locale) => normalizeLocale(locale) === primary);
}

/**
 * Parse an Accept-Language header and return the first supported locale.
 */
export function parseAcceptLanguage(header: string | undefined, locales: readonly string[]): string | undefined {
  if (!header) return undefined;

  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag?.trim() ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const matched = matchLocale(tag, locales);
    if (matched) return matched;
  }
  return undefined;
}

export function resolveLocale(options: ResolveLocaleOptions): ResolvedLocale {
  const { locales, defaultLocale } = options;

  const fromParam = matchLocale(options.param, locales);
  if (fromParam) return { locale: fromParam, source: "param" };

  const fromCookie = matchLocale(options.cookie, locales);
  if (fromCookie) return { locale: fromCookie, source: "cookie" };

  const fromHeader = parseAcceptLanguage(options.acceptLanguage, locales);
  if (fromHeader) return { locale: fromHeader, source: "header" };

  const fallback = matchLocale(defaultLocale, locales) ?? defaultLocale;
  return { locale: fallback, source: "default" };
}

export { DEFAULT_COOKIE_NAME, DEFAULT_PARAM_KEY };
