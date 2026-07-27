export { defineMeta, meta, type DefineMetaOptions } from "./define-meta.js";
export { seoI18nHead, type SeoI18nHeadOptions } from "./i18n.js";
export { createMetaContext, defineLoader } from "./loader.js";
export { configureSeoApp } from "./middleware.js";
export { default } from "./plugin.js";
export {
  getSeoRuntime,
  normalizeSeoOptions,
  readSeoOrigin,
  registerSeoRuntime,
  resetSeoRuntimeForTests,
  tryGetSeoRuntime,
  type NormalizedSeoOptions,
} from "./registry.js";
export { resolveMetaToHead, type ResolveMetaOptions } from "./resolve.js";
export { renderAtomFeed, renderFeed, renderRssFeed, type RenderFeedOptions } from "./feeds.js";
export { renderRobotsTxt, type RenderRobotsOptions } from "./robots.js";
export { createSitemapEntries, renderSitemapXml, type CreateSitemapOptions, type SitemapEntry } from "./sitemap.js";
export type {
  FeedConfig,
  FeedItem,
  HreflangAlternate,
  MetaContext,
  OgImageContext,
  OgImageHook,
  OpenGraphImage,
  OpenGraphMeta,
  OpenGraphType,
  RobotsConfig,
  RouteIcon,
  RouteManifestRef,
  RouteMeta,
  SeoPluginOptions,
  TwitterCardMeta,
} from "./types.js";
