import type { FeedConfig, FeedItem } from "./types.js";

export interface RenderFeedOptions {
  origin: string;
  feed: FeedConfig;
  format: "rss" | "atom";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resolveLink(origin: string, link: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  return `${origin.replace(/\/$/, "")}${link.startsWith("/") ? link : `/${link}`}`;
}

async function resolveItems(feed: FeedConfig): Promise<FeedItem[]> {
  return typeof feed.items === "function" ? await feed.items() : feed.items;
}

/** Render an RSS 2.0 feed. */
export async function renderRssFeed(options: RenderFeedOptions): Promise<string> {
  const { origin, feed } = options;
  const items = await resolveItems(feed);
  const channelLink = resolveLink(origin, feed.path);

  const itemXml = items
    .map((item) => {
      const pubDate = item.publishedAt ? `\n      <pubDate>${escapeXml(new Date(item.publishedAt).toUTCString())}</pubDate>` : "";
      const description = item.description ? `\n      <description>${escapeXml(item.description)}</description>` : "";
      const author = item.author ? `\n      <author>${escapeXml(item.author)}</author>` : "";
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(resolveLink(origin, item.link))}</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>${description}${author}${pubDate}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(channelLink)}</link>
    ${feed.description ? `<description>${escapeXml(feed.description)}</description>` : ""}
${itemXml}
  </channel>
</rss>`;
}

/** Render an Atom 1.0 feed. */
export async function renderAtomFeed(options: RenderFeedOptions): Promise<string> {
  const { origin, feed } = options;
  const items = await resolveItems(feed);
  const feedLink = resolveLink(origin, feed.path);

  const entries = items
    .map((item) => {
      const updated = item.updatedAt ?? item.publishedAt;
      return `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(resolveLink(origin, item.link))}" />
    <id>${escapeXml(item.id)}</id>
    ${updated ? `<updated>${escapeXml(new Date(updated).toISOString())}</updated>` : ""}
    ${item.description ? `<summary>${escapeXml(item.description)}</summary>` : ""}
    ${item.author ? `<author><name>${escapeXml(item.author)}</name></author>` : ""}
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feed.title)}</title>
  <link href="${escapeXml(feedLink)}" rel="self" />
  <id>${escapeXml(feedLink)}</id>
  ${feed.description ? `<subtitle>${escapeXml(feed.description)}</subtitle>` : ""}
${entries}
</feed>`;
}

/** Render RSS or Atom based on format. */
export async function renderFeed(options: RenderFeedOptions): Promise<string> {
  return options.format === "atom" ? renderAtomFeed(options) : renderRssFeed(options);
}
