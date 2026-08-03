import path from "node:path";

export function slugFromRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.(mdx|md)$/, "").replace(/\/index$/, "");
  const segments = withoutExt.split("/");
  return segments[segments.length - 1] ?? withoutExt;
}

export function entryIdFromFile(contentRoot: string, file: string): string {
  const rel = path.relative(contentRoot, file).split(path.sep).join("/");
  return rel.replace(/\.(mdx|md)$/, "").replace(/\/index$/, "");
}

export function routeFromEntry(
  collectionName: string,
  slug: string,
  locale?: string,
): string {
  const base = `/${collectionName}/${slug}`.replace(/\/+/g, "/");
  return locale ? `/${locale}${base}`.replace(/\/+/g, "/") : base;
}

import { DuplicateSlugError } from "./validation.js";

export function detectDuplicateSlugs(
  entries: { slug: string; file: string; locale?: string }[],
  collection: string,
): void {
  const map = new Map<string, string[]>();
  for (const entry of entries) {
    const key = entry.locale ? `${entry.locale}/${entry.slug}` : entry.slug;
    const list = map.get(key) ?? [];
    list.push(entry.file);
    map.set(key, list);
  }
  for (const [slug, files] of map) {
    if (files.length > 1) {
      throw new DuplicateSlugError(collection, slug, files);
    }
  }
}
