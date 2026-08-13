import type { OtokHead } from "@kamod-ch/otok/server";
import type { RouteMeta, SeoPluginOptions } from "./types.js";

function joinOrigin(origin: string | undefined, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!origin) return path;
  const base = origin.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function applyTitleTemplate(title: string | undefined, template: string | undefined): string | undefined {
  if (!title) return undefined;
  if (!template) return title;
  return template.includes("%s") ? template.replace("%s", title) : `${title}${template}`;
}

function normalizeOgImages(
  image: string | import("./types.js").OpenGraphImage | Array<string | import("./types.js").OpenGraphImage> | undefined,
  defaultImage?: string,
): Array<{ url: string; width?: number; height?: number; alt?: string; type?: string }> {
  const raw = Array.isArray(image) ? image : image ? [image] : defaultImage ? [defaultImage] : [];
  return raw.map((entry) => (typeof entry === "string" ? { url: entry } : entry));
}

export interface ResolveMetaOptions {
  origin?: string;
  titleTemplate?: string;
  siteName?: string;
  defaultOgImage?: string;
  twitterSite?: string;
  globalIcons?: SeoPluginOptions["icons"];
  globalManifest?: SeoPluginOptions["manifest"];
}

/** Convert typed route metadata into an OtokHead result. */
export function resolveMetaToHead(meta: RouteMeta, options: ResolveMetaOptions = {}): OtokHead {
  const title = applyTitleTemplate(meta.title, options.titleTemplate);
  const canonicalHref = meta.canonical ? joinOrigin(options.origin ?? meta.canonical, meta.canonical) : undefined;

  const propertyMeta: Record<string, string> = {};
  const nameMeta: Record<string, string> = { ...(meta.meta ?? {}) };

  if (meta.robots) nameMeta.robots = meta.robots;

  const og = meta.openGraph ?? {};
  const ogTitle = og.title ?? meta.title;
  const ogDescription = og.description ?? meta.description;
  const ogUrl = og.url ?? canonicalHref;

  if (og.type) propertyMeta["og:type"] = og.type;
  if (ogTitle) propertyMeta["og:title"] = ogTitle;
  if (ogDescription) propertyMeta["og:description"] = ogDescription;
  if (ogUrl) propertyMeta["og:url"] = joinOrigin(options.origin, ogUrl);
  if (options.siteName ?? og.siteName) propertyMeta["og:site_name"] = options.siteName ?? og.siteName!;
  if (og.locale) propertyMeta["og:locale"] = og.locale;

  const images = normalizeOgImages(og.images ?? og.image ?? undefined, options.defaultOgImage);
  if (images[0]) propertyMeta["og:image"] = joinOrigin(options.origin, images[0].url);

  const twitter = meta.twitter ?? {};
  const twitterCard = twitter.card ?? (images[0] ? "summary_large_image" : "summary");
  nameMeta["twitter:card"] = twitterCard;
  if (twitter.site ?? options.twitterSite) nameMeta["twitter:site"] = twitter.site ?? options.twitterSite!;
  if (twitter.creator) nameMeta["twitter:creator"] = twitter.creator;
  if (twitter.title ?? ogTitle) nameMeta["twitter:title"] = twitter.title ?? ogTitle!;
  if (twitter.description ?? ogDescription) nameMeta["twitter:description"] = twitter.description ?? ogDescription!;
  const twitterImage = twitter.image ?? images[0]?.url;
  if (twitterImage) nameMeta["twitter:image"] = joinOrigin(options.origin, twitterImage);

  const links = [
    ...(canonicalHref ? [{ rel: "canonical", href: canonicalHref }] : []),
    ...(meta.hreflang ?? []).map((alt) => ({
      rel: "alternate",
      href: alt.href,
      hreflang: alt.hreflang,
    })),
    ...(meta.icons ?? options.globalIcons ?? []).map((icon) => ({
      rel: icon.rel ?? "icon",
      href: joinOrigin(options.origin, icon.href),
      type: icon.type,
    })),
    ...(meta.manifest ?? options.globalManifest
      ? [{ rel: "manifest", href: joinOrigin(options.origin, (meta.manifest ?? options.globalManifest)!.href) }]
      : []),
    ...(meta.rss ? [{ rel: "alternate", href: joinOrigin(options.origin, meta.rss), type: "application/rss+xml" }] : []),
    ...(meta.atom ? [{ rel: "alternate", href: joinOrigin(options.origin, meta.atom), type: "application/atom+xml" }] : []),
  ];

  const jsonLd = Array.isArray(meta.jsonLd)
    ? meta.jsonLd.length === 1
      ? meta.jsonLd[0]
      : { "@context": "https://schema.org", "@graph": meta.jsonLd }
    : meta.jsonLd;

  return {
    title,
    description: meta.description,
    lang: meta.lang,
    meta: nameMeta,
    propertyMeta,
    links,
    jsonLd,
  };
}
