import type { CacheConfig, CacheKeyInput } from "./types.js";
import type { RenderContext } from "../rendering/types.js";
import { isPersonalizedRequest } from "./personalization.js";

/** Bump when cache key semantics change (invalidates existing provider entries). */
export const CACHE_KEY_VERSION = 1;

export type VaryResolution =
  | { kind: "ok"; headers: Record<string, string> }
  | { kind: "uncacheable"; reason: "vary-star" };

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

/** Collect Vary header values from the incoming request (normalized names). */
export function resolveRequestVaryHeaders(config: CacheConfig, requestHeaders: Headers): VaryResolution {
  const configured = config.vary ?? [];
  if (configured.some((name) => normalizeHeaderName(name) === "*")) {
    return { kind: "uncacheable", reason: "vary-star" };
  }

  const headers: Record<string, string> = {};
  for (const name of configured) {
    const normalized = normalizeHeaderName(name);
    if (normalized === "*") return { kind: "uncacheable", reason: "vary-star" };
    const value = requestHeaders.get(name) ?? requestHeaders.get(normalized) ?? "";
    headers[normalized] = value;
  }
  return { kind: "ok", headers };
}

export function encodeQueryEntries(entries: ReadonlyArray<readonly [string, string]>): string {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of entries) {
    const list = grouped.get(key) ?? [];
    list.push(value);
    grouped.set(key, list);
  }

  const parts: string[] = [];
  for (const key of [...grouped.keys()].sort((a, b) => a.localeCompare(b))) {
    for (const value of grouped.get(key)!) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join("&");
}

function encodeScope(input: CacheKeyInput): string {
  if (input.shared) return "shared";
  const parts: string[] = [];
  if (input.tenantId) parts.push(`t:${input.tenantId}`);
  if (input.userId) parts.push(`u:${input.userId}`);
  if (input.scopeLocale) parts.push(`l:${input.scopeLocale}`);
  return parts.length > 0 ? parts.join(".") : "isolated-none";
}

/**
 * Versioned, collision-resistant cache key shared by read, write, and revalidation helpers.
 * Distinguishes route id from the request URL path and includes normalized query parameters.
 */
export function buildCacheKey(input: CacheKeyInput): string {
  const parts = [
    `v${CACHE_KEY_VERSION}`,
    input.method.toUpperCase(),
    `rid:${input.routeId}`,
    `url:${input.requestPath}`,
    `q:${encodeQueryEntries(input.query)}`,
    `scope:${encodeScope(input)}`,
  ];

  if (input.varyHeaders && Object.keys(input.varyHeaders).length > 0) {
    for (const [key, value] of Object.entries(input.varyHeaders).sort(([a], [b]) => a.localeCompare(b))) {
      parts.push(`vary:${key}=${value}`);
    }
  }

  return parts.join("|");
}

export function allowsServerHtmlCache(ctx: RenderContext, cache: CacheConfig): boolean {
  if (cache.noStore) return false;
  if (!isPersonalizedRequest(ctx)) return true;
  const scope = ctx.cacheScope;
  return Boolean(scope?.userId || scope?.tenantId);
}

export function buildCacheKeyFromContext(
  cache: CacheConfig,
  ctx: RenderContext,
  requestHeaders: Headers,
): { key: string } | { skip: true; reason: string } {
  const vary = resolveRequestVaryHeaders(cache, requestHeaders);
  if (vary.kind === "uncacheable") {
    return { skip: true, reason: vary.reason };
  }

  if (!allowsServerHtmlCache(ctx, cache)) {
    return { skip: true, reason: "personalized-without-scope" };
  }

  const personalized = isPersonalizedRequest(ctx);
  const scope = ctx.cacheScope;

  const key = buildCacheKey({
    method: ctx.method,
    routeId: ctx.routeId,
    requestPath: ctx.requestPath,
    query: ctx.query,
    shared: !personalized,
    userId: scope?.userId,
    tenantId: scope?.tenantId,
    scopeLocale: scope?.locale,
    varyHeaders: vary.headers,
  });

  return { key };
}
