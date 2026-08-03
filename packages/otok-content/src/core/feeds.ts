import type { ContentEntry } from "./types.js";

export interface FeedOptions {
  title: string;
  description?: string;
  origin: string;
  collection: string;
  entries: ContentEntry[];
  limit?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entryDate(entry: ContentEntry): string {
  const data = entry.data as Record<string, unknown>;
  const raw = data.date ?? data.publishedAt ?? data.updatedAt;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function entryTitle(entry: ContentEntry): string {
  const data = entry.data as Record<string, unknown>;
  return (typeof data.title === "string" && data.title) || entry.slug;
}

function entryDescription(entry: ContentEntry): string {
  const data = entry.data as Record<string, unknown>;
  return (
    (typeof data.description === "string" && data.description) ||
    (typeof data.excerpt === "string" && data.excerpt) ||
    ""
  );
}

export function renderRssFeed(options: FeedOptions): string {
  const limit = options.limit ?? 20;
  const items = options.entries.slice(0, limit);
  const channelUrl = `${options.origin.replace(/\/+$/, "")}/${options.collection}`;

  const itemXml = items
    .map((entry) => {
      const url = `${options.origin.replace(/\/+$/, "")}${entry.route}`;
      return `<item>
  <title>${escapeXml(entryTitle(entry))}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <pubDate>${new Date(entryDate(entry)).toUTCString()}</pubDate>
  <description>${escapeXml(entryDescription(entry))}</description>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(options.title)}</title>
  <link>${escapeXml(channelUrl)}</link>
  <description>${escapeXml(options.description ?? options.title)}</description>
${itemXml}
</channel>
</rss>`;
}

export function renderAtomFeed(options: FeedOptions): string {
  const limit = options.limit ?? 20;
  const items = options.entries.slice(0, limit);
  const feedUrl = `${options.origin.replace(/\/+$/, "")}/${options.collection}`;

  const entryXml = items
    .map((entry) => {
      const url = `${options.origin.replace(/\/+$/, "")}${entry.route}`;
      return `<entry>
  <title>${escapeXml(entryTitle(entry))}</title>
  <link href="${escapeXml(url)}" />
  <id>${escapeXml(url)}</id>
  <updated>${entryDate(entry)}</updated>
  <summary>${escapeXml(entryDescription(entry))}</summary>
</entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(options.title)}</title>
  <link href="${escapeXml(feedUrl)}" />
  <updated>${entryDate(items[0] ?? options.entries[0] ?? { data: {} } as ContentEntry)}</updated>
${entryXml}
</feed>`;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export function contentEntriesToSitemapUrls(
  origin: string,
  entries: ContentEntry[],
): SitemapUrl[] {
  return entries.map((entry) => {
    const data = entry.data as Record<string, unknown>;
    const raw = data.date ?? data.updatedAt ?? entry.git?.updatedAt;
    let lastmod: string | undefined;
    if (raw instanceof Date) lastmod = raw.toISOString();
    else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) {
      lastmod = new Date(raw).toISOString();
    } else if (entry.git?.updatedAt) {
      lastmod = entry.git.updatedAt;
    }

    return {
      loc: `${origin.replace(/\/+$/, "")}${entry.route}`,
      lastmod,
    };
  });
}
