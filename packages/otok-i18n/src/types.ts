/** Supported URL routing strategies for locale detection. */
export type RoutingMode = "prefix" | "prefix-except-default" | "domain" | "none";

export type LocaleSource = "url" | "domain" | "cookie" | "header" | "default";

export type MessageValue = string | Record<string, string>;

export type FlatMessages = Record<string, string>;

export type MessageLoader =
  | (() => Promise<{ default?: FlatMessages } | FlatMessages>)
  | (() => FlatMessages);

export type NamespaceLoader = Record<string, MessageLoader>;

export interface I18nPluginOptions<
  Locales extends readonly string[] = readonly string[],
> {
  locales: Locales;
  defaultLocale: Locales[number];
  /** Secondary locale for missing keys. Defaults to `defaultLocale`. */
  fallbackLocale?: Locales[number];
  routing?: RoutingMode;
  /** Hostname → locale for `routing: "domain"`. */
  domains?: Record<string, Locales[number]>;
  /** Per-locale message loaders (lazy). Optional namespace loaders via `messages[locale][namespace]`. */
  messages: Record<Locales[number], MessageLoader | NamespaceLoader>;
  paramKey?: string;
  cookieName?: string;
  contextKey?: string;
  /** Write resolved locale to cookie. Default: true. */
  persistLocale?: boolean;
  /** Log missing translation keys in development. Default: true in dev. */
  warnMissingKeys?: boolean;
  /** Redirect invalid locale URL prefixes to canonical paths. Default: true. */
  redirectUnknownLocale?: boolean;
  /** Cookie max-age in seconds. Default: 1 year. */
  cookieMaxAge?: number;
}

/** Legacy flat-catalog config (still supported). */
export interface I18nConfig<Catalog extends Record<string, FlatMessages> = Record<string, FlatMessages>> {
  catalog: Catalog;
  locales: readonly (keyof Catalog & string)[];
  defaultLocale: keyof Catalog & string;
  fallbackLocale?: keyof Catalog & string;
  routing?: RoutingMode;
  domains?: Record<string, keyof Catalog & string>;
  paramKey?: string;
  cookieName?: string;
  contextKey?: string;
}

export interface Formatters {
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
}

export type TranslateValues = Record<string, string | number | boolean | null | undefined>;

export interface Translator {
  (key: string, values?: TranslateValues, fallback?: string): string;
}

export interface I18nContext {
  locale: string;
  defaultLocale: string;
  fallbackLocale: string;
  source: LocaleSource;
  routing: RoutingMode;
  t: Translator;
  formatters: Formatters;
  /** Serializable payload for client hydration — only active locale messages. */
  toClientPayload: () => I18nClientPayload;
}

export interface I18nClientPayload {
  locale: string;
  defaultLocale: string;
  fallbackLocale: string;
  messages: FlatMessages;
  routing: RoutingMode;
}

export interface LocalizedRouteNames {
  readonly [routeKey: string]: Readonly<Record<string, string>>;
}

export interface ResolveLocaleInput {
  pathname: string;
  hostname: string;
  cookie?: string | undefined;
  acceptLanguage?: string | undefined;
  locales: readonly string[];
  defaultLocale: string;
  routing: RoutingMode;
  domains?: Record<string, string> | undefined;
}

export interface ResolvedLocaleResult {
  locale: string;
  source: LocaleSource;
  /** Locale segment stripped from pathname, if any. */
  pathLocale?: string | undefined;
  /** Whether the first path segment looks like a locale but is unsupported. */
  unknownPathLocale?: string | undefined;
  /** Canonical pathname without locale prefix. */
  canonicalPathname: string;
}
