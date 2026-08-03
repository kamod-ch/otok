import type { ContentEntry, SearchIndexEntry } from "./types.js";

export function buildSearchIndex(
  collection: string,
  entries: ContentEntry[],
): SearchIndexEntry[] {
  return entries.map((entry) => {
    const data = entry.data as Record<string, unknown>;
    const title =
      (typeof data.title === "string" && data.title) ||
      (typeof data.name === "string" && data.name) ||
      entry.slug;
    const excerpt =
      (typeof data.description === "string" && data.description) ||
      (typeof data.excerpt === "string" && data.excerpt) ||
      undefined;

    return {
      collection,
      id: entry.id,
      slug: entry.slug,
      route: entry.route,
      title,
      excerpt,
      locale: entry.locale,
    };
  });
}

export function searchIndex(
  index: SearchIndexEntry[],
  query: string,
  limit = 20,
): SearchIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = index
    .map((entry) => {
      const haystack = [entry.title, entry.excerpt ?? "", entry.slug].join(" ").toLowerCase();
      if (!haystack.includes(q)) return null;
      const titleMatch = entry.title.toLowerCase().includes(q) ? 2 : 0;
      const slugMatch = entry.slug.toLowerCase().includes(q) ? 1 : 0;
      return { entry, score: titleMatch + slugMatch + 1 };
    })
    .filter((item): item is { entry: SearchIndexEntry; score: number } => item != null)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}
