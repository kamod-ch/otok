import { localizePath } from "./routes.js";
import type { RoutingMode } from "./types.js";

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface LocalizedSitemapEntry {
  loc: string;
  alternates: SitemapAlternate[];
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface CreateSitemapOptions {
  origin: string;
  locales: readonly string[];
  defaultLocale: string;
  routing?: RoutingMode;
}

/**
 * Build localized sitemap entries with hreflang alternates for each path.
 */
export function createLocalizedSitemapEntries(
  paths: readonly string[],
  options: CreateSitemapOptions,
): LocalizedSitemapEntry[] {
  const { origin, locales, defaultLocale, routing = "prefix-except-default" } = options;
  const base = origin.replace(/\/$/, "");

  return paths.map((pathname) => {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const alternates: SitemapAlternate[] = locales.map((locale) => ({
      hreflang: locale,
      href: `${base}${localizePath(normalized, locale, { defaultLocale, routing })}`,
    }));

    alternates.push({
      hreflang: "x-default",
      href: `${base}${localizePath(normalized, defaultLocale, { defaultLocale, routing })}`,
    });

    return {
      loc: `${base}${localizePath(normalized, defaultLocale, { defaultLocale, routing })}`,
      alternates,
    };
  });
}

/** Render sitemap XML with xhtml:link alternates. */
export function renderSitemapXml(entries: LocalizedSitemapEntry[]): string {
  const xmlns = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const xhtml = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"';

  const urls = entries
    .map((entry) => {
      const altLinks = entry.alternates
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
        )
        .join("\n");
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      const changefreq = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : "";
      const priority =
        entry.priority != null ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : "";

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}
${altLinks}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${xmlns} ${xhtml}>
${urls}
</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
