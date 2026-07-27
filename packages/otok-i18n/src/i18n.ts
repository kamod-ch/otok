import { createTranslator, type MessageCatalog, type Translator } from "./catalog.js";
import {
  resolveLocale,
  type LocaleSource,
  type ResolveLocaleOptions,
} from "./locale.js";

export interface I18nConfig<Catalog extends MessageCatalog = MessageCatalog> {
  catalog: Catalog;
  locales: readonly (keyof Catalog & string)[];
  defaultLocale: keyof Catalog & string;
  paramKey?: string;
  cookieName?: string;
  contextKey?: string;
}

export interface I18nContext<Catalog extends MessageCatalog = MessageCatalog> {
  locale: keyof Catalog & string;
  defaultLocale: keyof Catalog & string;
  source: LocaleSource;
  t: Translator;
  catalog: Catalog;
}

export function createI18n<Catalog extends MessageCatalog>(
  config: I18nConfig<Catalog>,
  input: Pick<ResolveLocaleOptions, "param" | "cookie" | "acceptLanguage"> = {},
): I18nContext<Catalog> {
  const { locale, source } = resolveLocale({
    param: input.param,
    cookie: input.cookie,
    acceptLanguage: input.acceptLanguage,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
  });

  const resolvedLocale = (config.locales.includes(locale as keyof Catalog & string)
    ? locale
    : config.defaultLocale) as keyof Catalog & string;

  return {
    locale: resolvedLocale,
    defaultLocale: config.defaultLocale,
    source,
    catalog: config.catalog,
    t: createTranslator(config.catalog, resolvedLocale, config.defaultLocale),
  };
}
