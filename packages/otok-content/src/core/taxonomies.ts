import type { ContentEntry } from "./types.js";

export interface TaxonomyGroup {
  term: string;
  entries: ContentEntry[];
}

/** Group entries by a taxonomy field (string or string[] in frontmatter). */
export function groupByTaxonomy(
  entries: ContentEntry[],
  field: string,
): TaxonomyGroup[] {
  const map = new Map<string, ContentEntry[]>();

  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    const raw = data[field];
    const terms = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === "string")
      : typeof raw === "string"
        ? [raw]
        : [];

    for (const term of terms) {
      const list = map.get(term) ?? [];
      list.push(entry);
      map.set(term, list);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, group]) => ({ term, entries: group }));
}
