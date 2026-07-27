import { createContext } from "preact";
import { useContext, useMemo } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { createTranslator, type MessageCatalog, type Translator } from "./catalog.js";

export type I18nProviderProps<Catalog extends MessageCatalog = MessageCatalog> = {
  locale: keyof Catalog & string;
  defaultLocale: keyof Catalog & string;
  catalog: Catalog;
  children: ComponentChildren;
};

type I18nClientValue = {
  locale: string;
  defaultLocale: string;
  t: Translator;
};

const I18nContext = createContext<I18nClientValue | null>(null);

/**
 * Provides `t()` and locale for island / client trees.
 * Pass serializable `locale` + `catalog` from the loader.
 */
export function I18nProvider<Catalog extends MessageCatalog>({
  locale,
  defaultLocale,
  catalog,
  children,
}: I18nProviderProps<Catalog>) {
  const value = useMemo((): I18nClientValue => {
    return {
      locale,
      defaultLocale,
      t: createTranslator(catalog, locale, defaultLocale),
    };
  }, [locale, defaultLocale, catalog]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Returns the translation function; outside a provider, returns `fallback ?? key`. */
export function useT(): Translator {
  const ctx = useContext(I18nContext);
  return useMemo(
    () => (key: string, fallback?: string) => (ctx ? ctx.t(key, fallback) : (fallback ?? key)),
    [ctx],
  );
}

export function useLocale(): string | null {
  return useContext(I18nContext)?.locale ?? null;
}
