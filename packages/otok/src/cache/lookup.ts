import type { CacheEntry, CacheLookupResult } from "./types.js";

export function isFresh(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.createdAt <= entry.maxAge * 1000;
}

export function isStale(entry: CacheEntry, now = Date.now()): boolean {
  const ageMs = now - entry.createdAt;
  return ageMs > entry.maxAge * 1000 && ageMs <= (entry.maxAge + entry.staleWhileRevalidate) * 1000;
}

export function lookupEntry(entry: CacheEntry | undefined, now = Date.now()): CacheLookupResult {
  if (!entry) return { hit: "miss" };
  if (isFresh(entry, now)) return { hit: "fresh", entry };
  if (isStale(entry, now)) return { hit: "stale", entry };
  return { hit: "miss" };
}
