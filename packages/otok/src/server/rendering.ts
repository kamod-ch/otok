import type { Context } from "hono";
import {
  buildCacheControlHeader,
  buildCacheKey,
  buildCacheTagHeader,
  buildVaryHeader,
  getCacheProvider,
  lookupEntry,
  withCacheStampedeProtection,
  type CacheConfig,
  type CacheEntry,
} from "../cache/index.js";
import { mergeRenderingConfig, resolveRenderPlan, type RenderContext, type RenderPlan, type RenderingConfig } from "../rendering/index.js";
import type { LayoutModule, OtokRoute } from "../shared/routes.js";

export interface HandlerRenderOptions {
  globalStreaming?: boolean;
  adapterCapabilities?: ReadonlySet<string>;
  defaultRendering?: RenderingConfig;
}

export function buildRenderContext(c: Context, params: Record<string, string>, pathname: string): RenderContext {
  const user = c.get("user" as never) as unknown;
  const hasAuth = Boolean(user);
  const cookie = c.req.header("cookie") ?? null;
  const hasSession = Boolean(cookie && /session|auth|otok_session/i.test(cookie));

  return {
    method: c.req.method,
    pathname,
    params,
    cookies: cookie,
    hasAuth,
    hasSession,
    locale: c.req.header("accept-language")?.split(",")[0]?.trim(),
    tenant: c.req.header("x-tenant") ?? undefined,
  };
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
  return resolveRenderPlan(merged, {
    ...ctx,
    globalStreaming: options.globalStreaming,
    adapterCapabilities: options.adapterCapabilities,
  }, route.path);
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

export async function readCachedHtml(
  cache: CacheConfig,
  ctx: RenderContext,
): Promise<{ html: string; headers: Headers } | undefined> {
  const provider = getCacheProvider();
  const key = buildCacheKey({
    method: ctx.method,
    pathname: ctx.pathname,
    params: ctx.params,
    locale: ctx.locale,
    tenant: ctx.tenant,
    private: cache.private === true,
    varyHeaders: cache.vary?.reduce<Record<string, string | undefined>>((acc, header) => {
      acc[header] = header.toLowerCase() === "accept-language" ? ctx.locale : undefined;
      return acc;
    }, {}),
  });

  const lookup = await provider.get(key);
  if (lookup?.hit === "fresh" && lookup.entry) {
    const headers = new Headers();
    applyCacheHeaders(headers, cache, 200);
    headers.set("x-otok-cache", "HIT");
    return { html: lookup.entry.value, headers };
  }

  if (lookup?.hit === "stale" && lookup.entry) {
    void withCacheStampedeProtection(key, async () => undefined);
    const headers = new Headers();
    applyCacheHeaders(headers, cache, 200);
    headers.set("x-otok-cache", "STALE");
    return { html: lookup.entry.value, headers };
  }

  return undefined;
}

export async function writeCachedHtml(
  cache: CacheConfig,
  ctx: RenderContext,
  html: string,
): Promise<void> {
  const provider = getCacheProvider();
  const key = buildCacheKey({
    method: ctx.method,
    pathname: ctx.pathname,
    params: ctx.params,
    locale: ctx.locale,
    tenant: ctx.tenant,
    private: cache.private === true,
  });

  const entry: CacheEntry = {
    value: html,
    tags: cache.tags ?? [],
    path: ctx.pathname,
    createdAt: Date.now(),
    maxAge: cache.maxAge ?? 0,
    staleWhileRevalidate: cache.staleWhileRevalidate ?? 0,
    private: cache.private === true,
  };

  await provider.set(key, entry);
}

export function logRenderingWarnings(warnings: ReturnType<typeof resolveRenderPlan>["warnings"]): void {
  for (const warning of warnings) {
    console.warn(`[otok:rendering] ${warning.code}: ${warning.message}`);
  }
}
