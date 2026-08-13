import type { I18nHeadOptions } from "@kamod-ch/otok-i18n";
import { i18nHead } from "@kamod-ch/otok-i18n";
import type { OtokHead } from "@kamod-ch/otok/server";
import { resolveMetaToHead } from "./resolve.js";
import type { RouteMeta } from "./types.js";

export interface SeoI18nHeadOptions extends I18nHeadOptions {
  meta?: RouteMeta;
  titleTemplate?: string;
  siteName?: string;
  defaultOgImage?: string;
  twitterSite?: string;
}

/**
 * Merge route metadata with i18n head output (lang, hreflang, canonical).
 * Requires `@kamod-ch/otok-i18n` at runtime.
 */
export function seoI18nHead(options: SeoI18nHeadOptions): OtokHead {
  const { meta, titleTemplate, siteName, defaultOgImage, twitterSite, ...i18nOptions } = options;
  const i18n = i18nHead(i18nOptions);
  if (!meta) return i18n;

  const resolved = resolveMetaToHead(meta, {
    origin: i18nOptions.origin,
    titleTemplate,
    siteName,
    defaultOgImage,
    twitterSite,
  });

  const links = [...(resolved.links ?? [])];
  for (const link of i18n.links ?? []) {
    if (!links.some((existing) => existing.rel === link.rel && existing.href === link.href)) {
      links.push(link);
    }
  }

  return {
    ...resolved,
    lang: i18n.lang ?? resolved.lang,
    links,
  };
}
