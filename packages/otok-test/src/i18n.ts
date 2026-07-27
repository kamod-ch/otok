import type { ParsedHtml } from "./html.js";

export interface I18nTestConfig {
  locale: string;
  defaultLocale?: string;
  pathname?: string;
  hreflang?: string[];
}

export function expectLocale(document: ParsedHtml, locale: string): void {
  const html = document.querySelector("html");
  const lang = html?.getAttribute("lang");
  if (lang !== locale) {
    throw new Error(`Expected html[lang="${locale}"] but received "${lang ?? ""}".`);
  }
}

export function expectHreflang(document: ParsedHtml, locale: string): void {
  const link = document.querySelector(`link[hreflang=${locale}]`);
  if (!link) {
    throw new Error(`Expected hreflang link for locale "${locale}".`);
  }
}

export function createI18nTestContext(config: I18nTestConfig) {
  return {
    locale: config.locale,
    defaultLocale: config.defaultLocale ?? config.locale,
    pathname: config.pathname ?? "/",
    expectDocument(document: ParsedHtml) {
      expectLocale(document, config.locale);
      if (config.hreflang) {
        for (const locale of config.hreflang) {
          expectHreflang(document, locale);
        }
      }
    },
  };
}

export function i18nAcceptLanguageHeader(locale: string): Record<string, string> {
  return { "accept-language": locale };
}

export function prefixedLocalePath(locale: string, pathname: string, defaultLocale?: string): string {
  if (defaultLocale && locale === defaultLocale) return pathname;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}
