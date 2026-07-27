import type { LoaderResult, RouteParams } from "otok/server";

export type JsonLdValue = string | number | boolean | null | JsonLdValue[] | { [key: string]: JsonLdValue };

export type OpenGraphType =
  | "website"
  | "article"
  | "product"
  | "profile"
  | "book"
  | "music.song"
  | "music.album"
  | "music.playlist"
  | "music.radio_station"
  | "video.movie"
  | "video.episode"
  | "video.tv_show"
  | "video.other";

export interface OpenGraphMeta {
  type?: OpenGraphType;
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  locale?: string;
  image?: string | OpenGraphImage;
  images?: Array<string | OpenGraphImage>;
}

export interface OpenGraphImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
}

export interface TwitterCardMeta {
  card?: "summary" | "summary_large_image" | "app" | "player";
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface RouteIcon {
  rel?: "icon" | "apple-touch-icon" | "mask-icon";
  href: string;
  sizes?: string;
  type?: string;
  color?: string;
}

export interface RouteManifestRef {
  href: string;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

export interface RouteMeta {
  title?: string;
  description?: string;
  lang?: string;
  canonical?: string;
  robots?: string;
  openGraph?: OpenGraphMeta;
  twitter?: TwitterCardMeta;
  jsonLd?: Record<string, JsonLdValue> | Array<Record<string, JsonLdValue>>;
  icons?: RouteIcon[];
  manifest?: RouteManifestRef;
  hreflang?: HreflangAlternate[];
  rss?: string;
  atom?: string;
  meta?: Record<string, string>;
}

export interface MetaContext<Data extends LoaderResult = LoaderResult> {
  data: Data;
  params: RouteParams;
  route: string;
  locale?: string;
  origin?: string;
}

export interface SeoPluginOptions {
  /** Absolute site origin, e.g. `https://example.com`. Required for canonical URLs and sitemaps. */
  origin: string;
  /** Global title template. `%s` is replaced by the page title. */
  titleTemplate?: string;
  /** Default site name for Open Graph. */
  siteName?: string;
  /** Default Open Graph image URL. */
  defaultOgImage?: string;
  /** Default Twitter handle, e.g. `@example`. */
  twitterSite?: string;
  /** Paths included in the auto-generated sitemap. */
  sitemapPaths?: string[];
  /** Serve `/robots.txt`. Default: true. */
  robots?: boolean | RobotsConfig;
  /** Serve `/sitemap.xml`. Default: true when sitemapPaths is set. */
  sitemap?: boolean;
  /** RSS feed configuration. */
  rss?: FeedConfig;
  /** Atom feed configuration. */
  atom?: FeedConfig;
  /** Dynamic OG image hook — receives route context and returns an image URL. */
  ogImage?: OgImageHook;
  /** Icons and manifest injected on every page unless overridden. */
  icons?: RouteIcon[];
  manifest?: RouteManifestRef;
}

export interface RobotsConfig {
  allow?: string[];
  disallow?: string[];
  sitemap?: string;
  host?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
}

export interface FeedConfig {
  path: string;
  title: string;
  description?: string;
  items: FeedItem[] | (() => FeedItem[] | Promise<FeedItem[]>);
}

export type OgImageHook = (ctx: OgImageContext) => string | Promise<string>;

export interface OgImageContext {
  route: string;
  params: RouteParams;
  locale?: string;
  title?: string;
}
