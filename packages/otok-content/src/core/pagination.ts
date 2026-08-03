import type { ContentEntry, PaginationResult } from "./types.js";

export function paginateCollection<TData>(
  entries: ContentEntry<TData>[],
  page: number,
  pageSize: number,
): PaginationResult<TData> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const start = (safePage - 1) * safeSize;
  return {
    entries: entries.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages,
  };
}
