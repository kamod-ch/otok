import type { Context } from "hono";
import {
  buildCacheControlHeader,
  buildCacheKeyFromContext,
  buildCacheTagHeader,
  buildVaryHeader,
  getCacheProvider,
  type CacheConfig,
  type CacheEntry,
} from "../cache/index.js";
import { isPersonalizedRequest } from "../cache/personalization.js";
import { resolveOtokCacheScope } from "../cache/scope.js";
import {
  mergeRenderingConfig,
  resolveRenderPlan,
  type RenderContext,
  type RenderPlan,
  type RenderingConfig,
} from "../rendering/index.js";
import type { LayoutModule, OtokRoute } from "../shared/routes.js";

export interface HandlerRenderOptions {
  globalStreaming?: boolean;
  adapterCapabilities?: ReadonlySet<string>;
  defaultRendering?: RenderingConfig;
}

function parseQueryEntries(url: URL): ReadonlyArray<readonly [string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams.entries()) {
    entries.push([key, value]);
  }
  return entries;
}

export function buildRenderContext(
  c: Context,
  params: Record<string, string>,
  route: Pick<OtokRoute, "path" | "id">,
): RenderContext {
  const url = new URL(c.req.url);
  const user = c.get("user" as never) as unknown;
  const hasAuth = Boolean(user);
  const cookie = c.req.header("cookie") ?? null;
  const hasSession = Boolean(cookie && /session|auth|otok_session/i.test(cookie));

  const ctx: RenderContext = {
    method: c.req.method,
    pathname: route.path,
    routeId: route.id,
    requestPath: url.pathname,
    query: parseQueryEntries(url),
    params,
    cookies: cookie,
    hasAuth,
    hasSession,
    cacheScope: resolveOtokCacheScope(c),
  };

  return ctx;
}

export function resolveRouteRendering(
  route: OtokRoute,
  ctx: RenderContext,
  options: HandlerRenderOptions,
): { plan: RenderPlan; warnings: ReturnType<typeof resolveRenderPlan>["warnings"] } {
  const layoutRendering = [...(route.layouts ?? [])]
    .reverse()
    .map((layout: LayoutModule & { rendering?: RenderingConfig }) => layout.rendering);

  const merged = mergeRenderingConfig(options.defaultRendering, ...layoutRendering, route.module.rendering);
  return resolveRenderPlan(
    merged,
    {
      ...ctx,
      globalStreaming: options.globalStreaming,
      adapterCapabilities: options.adapterCapabilities,
    },
    route.path,
  );
}

export function applyCacheHeaders(headers: Headers, cache: CacheConfig, status: number): void {
  if (status >= 400) {
    headers.set("cache-control", "no-store");
    return;
  }
  headers.set("cache-control", buildCacheControlHeader(cache));
  const tags = buildCacheTagHeader(cache.tags);
  if (tags) headers.set("cache-tag", tags);
  const vary = buildVaryHeader(cache);
  if (vary) headers.set("vary", vary);
}

function responseHasSetCookie(responseHeaders: Headers, c: Context): boolean {
  if (responseHeaders.has("set-cookie")) return true;
  return c.res.headers.getSetCookie().length > 0;
}

export async function readCachedHtml(
  cache: CacheConfig,
  ctx: RenderContext,
  requestHeaders: Headers,
): Promise<{ html: string; headers: Headers } | undefined> {
  if (cache.noStore) return undefined;

  const resolved = buildCacheKeyFromContext(cache, ctx, requestHeaders);
  if ("skip" in resolved) return undefined;

  const provider = getCacheProvider();
  const lookup = await provider.get(resolved.key);
  if (lookup?.hit !== "fresh" || !lookup.entry) {
    return undefined;
  }

  const headers = new Headers();
  applyCacheHeaders(headers, cache, 200);
  headers.set("x-otok-cache", "HIT");
  return { html: lookup.entry.value, headers };
}

export interface WriteCachedHtmlOptions {
  status: number;
  responseHeaders: Headers;
  honoContext: Context;
}

export async function writeCachedHtml(
  cache: CacheConfig,
  ctx: RenderContext,
  html: string,
  options: WriteCachedHtmlOptions,
): Promise<void> {
  if (cache.noStore) return;
  if (options.status >= 400) return;
  if (responseHasSetCookie(options.responseHeaders, options.honoContext)) return;

  const resolved = buildCacheKeyFromContext(cache, ctx, options.honoContext.req.raw.headers);
  if ("skip" in resolved) return;

  const provider = getCacheProvider();
  const entry: CacheEntry = {
    value: html,
    tags: cache.tags ?? [],
    path: ctx.requestPath,
    createdAt: Date.now(),
    maxAge: cache.maxAge ?? 0,
    staleWhileRevalidate: cache.staleWhileRevalidate ?? 0,
    private: isPersonalizedRequest(ctx) || cache.private === true,
  };

  await provider.set(resolved.key, entry);
}

export function logRenderingWarnings(warnings: ReturnType<typeof resolveRenderPlan>["warnings"]): void {
  for (const warning of warnings) {
    console.warn(`[otok:rendering] ${warning.code}: ${warning.message}`);
  }
}
