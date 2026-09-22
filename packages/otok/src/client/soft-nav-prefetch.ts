import { OTOK_PAGE_ATTR } from "../shared/navigation.js";

export interface SoftNavPrefetchScope {
  /** Bump when the signed-in user or session identity changes. */
  authEpoch?: string;
  tenantId?: string;
  locale?: string;
}

export type SoftNavPrefetchInvalidateReason = "manual" | "mutation" | "auth" | "tenant" | "locale" | "scope";

export interface SoftNavPrefetchInvalidateOptions {
  reason?: SoftNavPrefetchInvalidateReason;
}

export interface PrefetchedNavigationDocument {
  document: Document;
  /** Final URL after redirects (used for history). */
  url: string;
}

interface PrefetchCacheEntry {
  document: Document;
  requestedKey: string;
  finalUrl: string;
  fetchedAt: number;
  expiresAt: number;
  prefetchGeneration: number;
  scopeEpoch: number;
}

const DEFAULT_PREFETCH_TTL_MS = 30_000;
const MAX_PREFETCH_ENTRIES = 10;
const MAX_PARALLEL_PREFETCHES = 3;

let prefetchGeneration = 0;
let scopeEpoch = 0;
let scope: SoftNavPrefetchScope = {};

const cache = new Map<string, PrefetchCacheEntry>();
const inFlight = new Map<string, Promise<void>>();
let activePrefetches = 0;

function parseCacheControl(header: string | null): {
  noStore: boolean;
  noCache: boolean;
  private: boolean;
  maxAge: number | undefined;
} {
  if (!header) {
    return { noStore: false, noCache: false, private: false, maxAge: undefined };
  }
  const parts = header
    .toLowerCase()
    .split(",")
    .map((p) => p.trim());
  let maxAge: number | undefined;
  for (const part of parts) {
    if (part === "no-store") return { noStore: true, noCache: true, private: false, maxAge: undefined };
    if (part === "no-cache") {
      /* continue */
    }
    if (part === "private") {
      /* flagged below */
    }
    const maxAgeMatch = /^max-age=(\d+)$/.exec(part);
    if (maxAgeMatch) maxAge = Number(maxAgeMatch[1]);
  }
  return {
    noStore: parts.includes("no-store"),
    noCache: parts.includes("no-cache"),
    private: parts.includes("private"),
    maxAge,
  };
}

export function normalizeSoftNavUrlKey(
  url: string,
  base = typeof window !== "undefined" ? window.location.href : "http://localhost/",
): string {
  const resolved = new URL(url, base);
  return `${resolved.origin}${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function shouldStoreSoftNavPrefetch(response: Response): boolean {
  const cc = parseCacheControl(response.headers.get("cache-control"));
  if (cc.noStore || cc.noCache) return false;
  if (cc.private) return false;
  const vary = response.headers.get("vary")?.toLowerCase() ?? "";
  if (vary.includes("cookie") || vary.includes("authorization")) return false;
  return true;
}

export function prefetchTtlMs(response: Response, _now = Date.now()): number {
  const cc = parseCacheControl(response.headers.get("cache-control"));
  if (cc.maxAge !== undefined) return cc.maxAge * 1000;
  return DEFAULT_PREFETCH_TTL_MS;
}

export function parseSoftNavHtmlResponse(
  response: Response,
  requestedUrl: string,
  html: string,
): PrefetchedNavigationDocument | null {
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;

  const finalUrl = response.url || requestedUrl;
  const final = new URL(finalUrl, typeof window !== "undefined" ? window.location.href : requestedUrl);
  const requested = new URL(requestedUrl, typeof window !== "undefined" ? window.location.href : requestedUrl);
  if (final.origin !== requested.origin) return null;

  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document.querySelector(`[${OTOK_PAGE_ATTR}]`)) return null;

  return { document, url: finalUrl };
}

export function getSoftNavPrefetchGeneration(): number {
  return prefetchGeneration;
}

export function getSoftNavPrefetchScopeEpoch(): number {
  return scopeEpoch;
}

export function setSoftNavPrefetchScope(next: SoftNavPrefetchScope): void {
  const changed =
    next.authEpoch !== scope.authEpoch || next.tenantId !== scope.tenantId || next.locale !== scope.locale;
  scope = { ...next };
  if (changed) {
    scopeEpoch += 1;
    invalidateSoftNavPrefetch({ reason: "scope" });
  }
}

export function invalidateSoftNavPrefetch(_options: SoftNavPrefetchInvalidateOptions = {}): void {
  prefetchGeneration += 1;
  cache.clear();
}

export function takePrefetchedNavigationDocument(
  requestedUrl: string,
  now = Date.now(),
): PrefetchedNavigationDocument | null {
  const key = normalizeSoftNavUrlKey(requestedUrl);
  const entry = cache.get(key);
  if (!entry) return null;
  cache.delete(key);

  if (entry.prefetchGeneration !== prefetchGeneration) return null;
  if (entry.scopeEpoch !== scopeEpoch) return null;
  if (now > entry.expiresAt) return null;

  return { document: entry.document, url: entry.finalUrl };
}

function evictOldestPrefetchEntry(): void {
  const first = cache.keys().next().value;
  if (first) cache.delete(first);
}

function storePrefetchEntry(
  requestedKey: string,
  parsed: PrefetchedNavigationDocument,
  response: Response,
  startedGeneration: number,
  startedScopeEpoch: number,
  now: number,
): void {
  if (!shouldStoreSoftNavPrefetch(response)) return;

  if (cache.size >= MAX_PREFETCH_ENTRIES) evictOldestPrefetchEntry();

  const ttl = prefetchTtlMs(response, now);
  cache.set(requestedKey, {
    document: parsed.document,
    requestedKey,
    finalUrl: parsed.url,
    fetchedAt: now,
    expiresAt: now + ttl,
    prefetchGeneration: startedGeneration,
    scopeEpoch: startedScopeEpoch,
  });
}

export function prefetchSoftNavUrl(url: string): void {
  if (typeof window === "undefined") return;

  const key = normalizeSoftNavUrlKey(url);
  if (cache.has(key)) return;
  if (inFlight.has(key)) return;
  if (activePrefetches >= MAX_PARALLEL_PREFETCHES) return;

  const startedGeneration = prefetchGeneration;
  const startedScopeEpoch = scopeEpoch;

  const task = (async () => {
    activePrefetches += 1;
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/html" },
        credentials: "same-origin",
        redirect: "follow",
      });

      if (startedGeneration !== prefetchGeneration) return;
      if (startedScopeEpoch !== scopeEpoch) return;

      const html = await response.text();
      if (startedGeneration !== prefetchGeneration) return;
      if (startedScopeEpoch !== scopeEpoch) return;

      const parsed = parseSoftNavHtmlResponse(response, url, html);
      if (!parsed) return;

      storePrefetchEntry(key, parsed, response, startedGeneration, startedScopeEpoch, Date.now());
    } catch {
      /* ignore prefetch errors */
    } finally {
      activePrefetches -= 1;
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
}

/** @internal Test helpers */
export function __softNavPrefetchTestState(): {
  cacheSize: number;
  inFlight: number;
  activePrefetches: number;
  generation: number;
  scopeEpoch: number;
} {
  return {
    cacheSize: cache.size,
    inFlight: inFlight.size,
    activePrefetches,
    generation: prefetchGeneration,
    scopeEpoch,
  };
}
