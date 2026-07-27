import { createTranslator, type MessageCatalog } from "./catalog.js";
import { createFormatters } from "./format.js";
import { getCachedMessages } from "./messages.js";
import type { MessageLoader, NamespaceLoader } from "./types.js";
import type {
  FlatMessages,
  I18nClientPayload,
  I18nConfig,
  I18nContext,
  I18nPluginOptions,
  ResolveLocaleInput,
  RoutingMode,
} from "./types.js";
import { resolveLocale, resolveLocaleFull, type ResolveLocaleOptions } from "./locale.js";

export interface CreateI18nOptions {
  locale: string;
  source: import("./types.js").LocaleSource;
  routing: RoutingMode;
  defaultLocale: string;
  fallbackLocale: string;
  messages: FlatMessages;
  fallbackMessages?: FlatMessages;
  warnMissingKeys?: boolean;
}

export function buildI18nContext(options: CreateI18nOptions): I18nContext {
  const {
    locale,
    source,
    routing,
    defaultLocale,
    fallbackLocale,
    messages,
    fallbackMessages = {},
    warnMissingKeys,
  } = options;

  const formatters = createFormatters(locale);

  const toClientPayload = (): I18nClientPayload => ({
    locale,
    defaultLocale,
    fallbackLocale,
    messages,
    routing,
  });

  return {
    locale,
    defaultLocale,
    fallbackLocale,
    source,
    routing,
    t: createTranslator(messages, locale, fallbackLocale, fallbackMessages, { warnMissingKeys }),
    formatters,
    toClientPayload,
  };
}

/** Create i18n context from a static catalog (legacy API). */
export function createI18n<Catalog extends MessageCatalog>(
  config: I18nConfig<Catalog>,
  input: Pick<ResolveLocaleOptions, "param" | "cookie" | "acceptLanguage"> & { domain?: string } = {},
): I18nContext {
  const routing = config.routing ?? "prefix-except-default";
  const fallbackLocale = (config.fallbackLocale ?? config.defaultLocale) as string;

  const { locale, source } = resolveLocale({
    param: input.param,
    domain: input.domain,
    cookie: input.cookie,
    acceptLanguage: input.acceptLanguage,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
  });

  const resolvedLocale = (config.locales.includes(locale as keyof Catalog & string)
    ? locale
    : config.defaultLocale) as keyof Catalog & string;

  const messages = config.catalog[resolvedLocale] ?? {};
  const fallbackMessages = config.catalog[fallbackLocale as keyof Catalog & string] ?? {};

  return buildI18nContext({
    locale: resolvedLocale,
    source,
    routing,
    defaultLocale: config.defaultLocale,
    fallbackLocale,
    messages,
    fallbackMessages,
  });
}

/** Create i18n context with lazy-loaded messages (plugin API). */
export async function createI18nAsync(
  config: Pick<
    I18nPluginOptions,
    "locales" | "defaultLocale" | "fallbackLocale" | "messages" | "routing" | "domains"
  > & { warnMissingKeys?: boolean },
  input: ResolveLocaleInput,
  namespaces?: string[],
): Promise<I18nContext> {
  const routing = config.routing ?? "prefix-except-default";
  const fallbackLocale = config.fallbackLocale ?? config.defaultLocale;

  const resolved = resolveLocaleFull(input);
  const locale = config.locales.includes(resolved.locale) ? resolved.locale : config.defaultLocale;

  const loader = config.messages[locale as keyof typeof config.messages];
  const fallbackLoader = config.messages[fallbackLocale as keyof typeof config.messages];

  const messages = loader ? await getCachedMessages(locale, loader as MessageLoader | NamespaceLoader, namespaces) : {};
  const fallbackMessages = fallbackLoader
    ? await getCachedMessages(fallbackLocale, fallbackLoader as MessageLoader | NamespaceLoader, namespaces)
    : {};

  return buildI18nContext({
    locale,
    source: resolved.source,
    routing,
    defaultLocale: config.defaultLocale,
    fallbackLocale,
    messages,
    fallbackMessages,
    warnMissingKeys: config.warnMissingKeys,
  });
}

export type { I18nConfig, I18nContext };
