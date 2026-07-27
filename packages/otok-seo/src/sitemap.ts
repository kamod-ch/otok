export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  alternates?: Array<{ hreflang: string; href: string }>;
}

export interface CreateSitemapOptions {
  origin: string;
  paths: readonly string[];
  lastmod?: string;
}

/** Build basic sitemap entries from pathnames. */
export function createSitemapEntries(options: CreateSitemapOptions): SitemapEntry[] {
  const base = options.origin.replace(/\/$/, "");
  return options.paths.map((pathname) => ({
    loc: `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
    lastmod: options.lastmod,
  }));
}

/** Render sitemap XML, optionally with xhtml:link alternates. */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const xmlns = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const xhtml = entries.some((e) => e.alternates?.length) ? 'xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "";

  const urls = entries
    .map((entry) => {
      const altLinks = (entry.alternates ?? [])
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
        )
        .join("\n");
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      const changefreq = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : "";
      const priority = entry.priority != null ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : "";

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}
${altLinks}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${xmlns}${xhtml ? ` ${xhtml}` : ""}>
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
