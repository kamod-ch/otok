import type { ContentEntry, CollectionSortFn, CollectionSortOption } from "./types.js";

function getDateValue(entry: ContentEntry): number {
  const data = entry.data as Record<string, unknown>;
  const date = data.date ?? data.publishedAt ?? data.publishDate;
  if (date instanceof Date) return date.getTime();
  if (typeof date === "string") {
    const parsed = Date.parse(date);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function getOrderValue(entry: ContentEntry): number {
  const data = entry.data as Record<string, unknown>;
  return typeof data.order === "number" ? data.order : 0;
}

/** Resolve a built-in sort preset or pass through a custom comparator. */
export function resolveSortComparator(
  option: CollectionSortOption | CollectionSortFn,
): CollectionSortFn {
  if (typeof option === "function") return option;

  switch (option) {
    case "slug:desc":
      return (a, b) => b.slug.localeCompare(a.slug);
    case "date:asc":
      return (a, b) => getDateValue(a) - getDateValue(b) || a.slug.localeCompare(b.slug);
    case "date:desc":
      return (a, b) => getDateValue(b) - getDateValue(a) || a.slug.localeCompare(b.slug);
    case "order:asc":
      return (a, b) => getOrderValue(a) - getOrderValue(b) || a.slug.localeCompare(b.slug);
    case "order:desc":
      return (a, b) => getOrderValue(b) - getOrderValue(a) || a.slug.localeCompare(b.slug);
    case "slug:asc":
    default:
      return (a, b) => a.slug.localeCompare(b.slug);
  }
}
