# @kamod-ch/otok-seo

Typed route metadata, sitemaps, feeds, and SEO helpers for [Otok](https://github.com/kamod-ch/otok).

## Install

```bash
pnpm add @kamod-ch/otok-seo hono otok
```

## Plugin setup

```ts
import { defineConfig } from "otok";
import seo from "@kamod-ch/otok-seo";

export default defineConfig({
  plugins: [
    seo({
      origin: "https://example.com",
      titleTemplate: "%s | Example",
      siteName: "Example",
      sitemapPaths: ["/", "/about", "/products"],
      robots: true,
      icons: [{ href: "/favicon.ico" }],
      manifest: { href: "/site.webmanifest" },
    }),
  ],
});
```

Serves `/robots.txt` and `/sitemap.xml` automatically. With `@kamod-ch/otok-i18n`, sitemaps include hreflang alternates.

## Route metadata

```ts
import { defineMeta } from "@kamod-ch/otok-seo";

export const head = defineMeta(({ data, locale }) => ({
  title: data.product.name,
  description: data.product.description,
  canonical: `/products/${data.product.slug}`,
  lang: locale,
  openGraph: { type: "product" },
  twitter: { card: "summary_large_image" },
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.product.name,
  },
}));
```

## i18n integration

```ts
import { seoI18nHead } from "@kamod-ch/otok-seo";

export async function head({ data, params }) {
  return seoI18nHead({
    locale: data.locale,
    locales: ["de", "en"],
    defaultLocale: "de",
    origin: "https://example.com",
    pathname: `/products/${params.slug}`,
    meta: {
      title: data.product.name,
      description: data.product.description,
    },
  });
}
```

## Feeds

```ts
seo({
  origin: "https://example.com",
  rss: {
    path: "/feed.xml",
    title: "Blog",
    items: () => loadPosts(),
  },
});
```

## Dynamic OG images

```ts
seo({
  origin: "https://example.com",
  ogImage: ({ route, title }) => `/api/og?route=${encodeURIComponent(route)}&title=${encodeURIComponent(title ?? "")}`,
});
```

## Middleware order

Register `seo()` after `i18n()` so locale is available in loaders and OG hooks. Security middleware from `@kamod-ch/otok-security` should run before SEO utility routes.

## API

| Export | Purpose |
|--------|---------|
| `defineMeta` / `meta` | Typed route `head` factory |
| `resolveMetaToHead` | Convert `RouteMeta` → `OtokHead` |
| `seoI18nHead` | Merge metadata with i18n hreflang |
| `createSitemapEntries` / `renderSitemapXml` | Sitemap helpers |
| `renderRobotsTxt` | robots.txt renderer |
| `renderRssFeed` / `renderAtomFeed` | Feed renderers |
| `defineLoader` | Loader with `seo.origin` / locale |
