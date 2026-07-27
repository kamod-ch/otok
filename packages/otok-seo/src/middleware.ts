import type { Hono } from "hono";
import { renderFeed } from "./feeds.js";
import { renderRobotsTxt } from "./robots.js";
import { createSitemapEntries, renderSitemapXml } from "./sitemap.js";
import type { NormalizedSeoOptions } from "./registry.js";

async function buildLocalizedSitemap(options: NormalizedSeoOptions): Promise<string> {
  const i18nRuntime = await tryImportI18n();
  if (i18nRuntime) {
    const { createLocalizedSitemapEntries, renderSitemapXml: renderI18nSitemap } = i18nRuntime;
    const entries = createLocalizedSitemapEntries(options.sitemapPaths ?? [], {
      origin: options.origin,
      locales: i18nRuntime.locales,
      defaultLocale: i18nRuntime.defaultLocale,
      routing: i18nRuntime.routing,
    });
    return renderI18nSitemap(entries);
  }

  const entries = createSitemapEntries({
    origin: options.origin,
    paths: options.sitemapPaths ?? [],
  });
  return renderSitemapXml(entries);
}

async function tryImportI18n(): Promise<{
  createLocalizedSitemapEntries: typeof import("@kamod-ch/otok-i18n/sitemap").createLocalizedSitemapEntries;
  renderSitemapXml: typeof import("@kamod-ch/otok-i18n/sitemap").renderSitemapXml;
  locales: readonly string[];
  defaultLocale: string;
  routing?: import("@kamod-ch/otok-i18n").RoutingMode;
} | null> {
  try {
    const { tryGetI18nRuntime } = await import("@kamod-ch/otok-i18n");
    const runtime = tryGetI18nRuntime();
    if (!runtime) return null;
    const sitemap = await import("@kamod-ch/otok-i18n/sitemap");
    return {
      createLocalizedSitemapEntries: sitemap.createLocalizedSitemapEntries,
      renderSitemapXml: sitemap.renderSitemapXml,
      locales: runtime.options.locales,
      defaultLocale: runtime.options.defaultLocale,
      routing: runtime.options.routing,
    };
  } catch {
    return null;
  }
}

/** Register SEO utility routes on the Hono app. */
export function configureSeoApp(app: Hono, options: NormalizedSeoOptions): void {
  const contextKey = "seoOrigin";

  app.use("*", async (c, next) => {
    c.set(contextKey as never, options.origin as never);
    await next();
  });

  if (options.robotsEnabled) {
    app.get("/robots.txt", (c) => {
      const body = renderRobotsTxt({
        config: options.robots ?? true,
        origin: options.origin,
      });
      return c.text(body, 200, { "content-type": "text/plain; charset=utf-8" });
    });
  }

  if (options.sitemapEnabled) {
    app.get("/sitemap.xml", async (c) => {
      const body = await buildLocalizedSitemap(options);
      return c.text(body, 200, { "content-type": "application/xml; charset=utf-8" });
    });
  }

  if (options.rss) {
    app.get(options.rss.path, async (c) => {
      const body = await renderFeed({ origin: options.origin, feed: options.rss!, format: "rss" });
      return c.text(body, 200, { "content-type": "application/rss+xml; charset=utf-8" });
    });
  }

  if (options.atom) {
    app.get(options.atom.path, async (c) => {
      const body = await renderFeed({ origin: options.origin, feed: options.atom!, format: "atom" });
      return c.text(body, 200, { "content-type": "application/atom+xml; charset=utf-8" });
    });
  }

  if (options.ogImage) {
    app.get("/og-image", async (c) => {
      const url = new URL(c.req.url);
      const ctx = {
        route: url.searchParams.get("route") ?? "/",
        params: Object.fromEntries(url.searchParams.entries()),
        locale: url.searchParams.get("locale") ?? undefined,
        title: url.searchParams.get("title") ?? undefined,
      };
      const imageUrl = await options.ogImage!(ctx);
      return c.redirect(imageUrl, 302);
    });
  }
}
