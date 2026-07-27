import { createContext } from "preact";
import { useContext, useMemo } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { createTranslator, type FlatMessages, type Translator } from "./catalog.js";
import { createFormatters, localeDirection } from "./format.js";
import type { Formatters } from "./types.js";
import type { I18nClientPayload, RoutingMode } from "./types.js";

export type I18nProviderProps = I18nClientPayload & {
  children?: ComponentChildren;
};

export interface I18nHookValue {
  locale: string;
  defaultLocale: string;
  fallbackLocale: string;
  routing: RoutingMode;
  t: Translator;
  formatters: Formatters;
  formatDate: Formatters["formatDate"];
  formatTime: Formatters["formatTime"];
  formatNumber: Formatters["formatNumber"];
  formatPercent: Formatters["formatPercent"];
  formatCurrency: Formatters["formatCurrency"];
  direction: "ltr" | "rtl";
}

const I18nContext = createContext<I18nHookValue | null>(null);

/**
 * Provides `t()`, formatters, and locale for island / client trees.
 * Pass `i18n.toClientPayload()` from the loader — only the active locale is serialized.
 */
export function I18nProvider({
  locale,
  defaultLocale,
  fallbackLocale = defaultLocale,
  messages,
  routing = "prefix-except-default",
  children,
}: I18nProviderProps) {
  const value = useMemo((): I18nHookValue => {
    const formatters = createFormatters(locale);
    return {
      locale,
      defaultLocale,
      fallbackLocale,
      routing,
      t: createTranslator(messages, locale, fallbackLocale, {}, { warnMissingKeys: false }),
      formatters,
      formatDate: formatters.formatDate,
      formatTime: formatters.formatTime,
      formatNumber: formatters.formatNumber,
      formatPercent: formatters.formatPercent,
      formatCurrency: formatters.formatCurrency,
      direction: localeDirection(locale),
    };
  }, [locale, defaultLocale, fallbackLocale, messages, routing]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Legacy alias — accepts flat catalog shape. */
export function I18nProviderFromCatalog({
  locale,
  defaultLocale,
  catalog,
  children,
}: {
  locale: string;
  defaultLocale: string;
  catalog: Record<string, FlatMessages>;
  children: ComponentChildren;
}) {
  const messages = catalog[locale] ?? {};
  return (
    <I18nProvider
      locale={locale}
      defaultLocale={defaultLocale}
      fallbackLocale={defaultLocale}
      messages={messages}
      routing="prefix-except-default"
    >
      {children}
    </I18nProvider>
  );
}

export function useI18n(): I18nHookValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const noop = (key: string, _values?: unknown, fallback?: string) => fallback ?? key;
    const formatters = createFormatters("en");
    return {
      locale: "en",
      defaultLocale: "en",
      fallbackLocale: "en",
      routing: "none",
      t: noop,
      formatters,
      formatDate: formatters.formatDate,
      formatTime: formatters.formatTime,
      formatNumber: formatters.formatNumber,
      formatPercent: formatters.formatPercent,
      formatCurrency: formatters.formatCurrency,
      direction: "ltr",
    };
  }
  return ctx;
}

/** Alias for `useI18n`. */
export const useTranslation = useI18n;

/** Returns the translation function; outside a provider, returns `fallback ?? key`. */
export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): string | null {
  return useContext(I18nContext)?.locale ?? null;
}

export type { FlatMessages, I18nClientPayload, Translator } from "./types.js";
