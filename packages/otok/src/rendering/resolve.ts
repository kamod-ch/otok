import type { CacheConfig } from "../cache/types.js";
import type { RenderContext, RenderPlan, RenderingConfig, RenderingWarning, ResolvedRenderMode } from "./types.js";

const AUTH_COOKIE_PREFIXES = ["session", "auth", "otok_session", "__session"];

function isPersonalized(ctx: RenderContext): boolean {
  if (ctx.hasAuth || ctx.hasSession) return true;
  if (!ctx.cookies) return false;
  const lower = ctx.cookies.toLowerCase();
  return AUTH_COOKIE_PREFIXES.some((prefix) => lower.includes(`${prefix}=`));
}

function detectAutoMode(ctx: RenderContext, config: RenderingConfig): ResolvedRenderMode {
  if (config.prerender === true || (typeof config.prerender === "object" && config.prerender)) {
    return isPersonalized(ctx) ? "ssr" : "ssg";
  }
  if (config.deferred) return "ssr";
  if (isPersonalized(ctx)) return "ssr";
  return "ssr";
}

function resolveMode(config: RenderingConfig, ctx: RenderContext): ResolvedRenderMode {
  const mode = config.mode ?? "ssr";
  if (mode === "auto") return detectAutoMode(ctx, config);
  if (mode === "hybrid") return isPersonalized(ctx) ? "ssr" : "ssg";
  if (mode === "client") return "client";
  if (mode === "ssg") return "ssg";
  return "ssr";
}

function resolveStreaming(config: RenderingConfig, ctx: RenderContext): boolean {
  if (config.streaming === true) return true;
  if (config.streaming === false) return false;
  if (config.mode === "client") return false;
  return ctx.globalStreaming === true;
}

function sanitizeCache(
  config: RenderingConfig,
  ctx: RenderContext,
  routePattern?: string,
): { cache: CacheConfig | false; warnings: RenderingWarning[] } {
  const warnings: RenderingWarning[] = [];
  if (config.cache === false) return { cache: false, warnings };

  const personalized = isPersonalized(ctx);
  const base: CacheConfig = config.cache ? { ...config.cache } : {};

  if (personalized) {
    if (base.public === true) {
      warnings.push({
        code: "CACHE_PUBLIC_WITH_AUTH",
        message: `Route "${routePattern ?? ctx.pathname}" declares public cache but the request appears personalized. Forcing private cache.`,
        route: routePattern,
      });
      base.public = false;
    }
    base.private = true;
    if (base.sMaxAge !== undefined && base.sMaxAge > 0) {
      warnings.push({
        code: "CACHE_SMAXAGE_PERSONALIZED",
        message: `Route "${routePattern ?? ctx.pathname}" uses s-maxage with a personalized request. Removing s-maxage.`,
        route: routePattern,
      });
      delete base.sMaxAge;
    }
  }

  if (!base.noStore && base.maxAge === undefined && base.sMaxAge === undefined && !base.private && !base.public) {
    return { cache: false, warnings };
  }

  if (ctx.locale && !base.vary?.includes("Accept-Language")) {
    base.vary = [...(base.vary ?? []), "Accept-Language"];
  }

  return { cache: base, warnings };
}

export function resolveRenderPlan(
  config: RenderingConfig | undefined,
  ctx: RenderContext,
  routePattern?: string,
): { plan: RenderPlan; warnings: RenderingWarning[] } {
  const resolved = config ?? {};
  const mode = resolveMode(resolved, ctx);
  const { cache, warnings } = sanitizeCache(resolved, ctx, routePattern);

  if (
    mode === "ssg" &&
    ctx.adapterCapabilities &&
    !ctx.adapterCapabilities.has("prerender") &&
    !ctx.adapterCapabilities.has("ssr")
  ) {
    warnings.push({
      code: "SSG_UNSUPPORTED_ADAPTER",
      message: `Route "${routePattern ?? ctx.pathname}" is SSG but the active adapter cannot prerender or SSR.`,
      route: routePattern,
    });
  }

  if (mode === "ssr" && resolved.streaming && ctx.adapterCapabilities && !ctx.adapterCapabilities.has("streaming")) {
    warnings.push({
      code: "STREAMING_UNSUPPORTED",
      message: `Route "${routePattern ?? ctx.pathname}" requests streaming but the adapter does not support it.`,
      route: routePattern,
    });
  }

  if (resolved.deferred === true && resolveStreaming(resolved, ctx) !== true && mode === "ssr") {
    warnings.push({
      code: "DEFERRED_WITHOUT_STREAMING",
      message: `Route "${routePattern ?? ctx.pathname}" enables deferred slots without streaming. Slots still resolve in parallel but TTFB will wait for all of them.`,
      route: routePattern,
    });
  }

  const prerender =
    resolved.prerender === true
      ? {}
      : typeof resolved.prerender === "object"
        ? resolved.prerender
        : mode === "ssg"
          ? {}
          : undefined;

  return {
    plan: {
      mode,
      streaming: resolveStreaming(resolved, ctx) && mode === "ssr",
      cache,
      prerender,
      deferred: resolved.deferred === true && mode === "ssr",
      routePattern,
    },
    warnings,
  };
}

export function mergeRenderingConfig(...configs: Array<RenderingConfig | undefined>): RenderingConfig {
  return configs.reduce<RenderingConfig>((merged, current) => {
    if (!current) return merged;
    return {
      ...merged,
      ...current,
      cache:
        current.cache === false
          ? false
          : merged.cache === false
            ? current.cache
            : {
                ...merged.cache,
                ...current.cache,
              },
      prerender:
        current.prerender === false
          ? false
          : typeof current.prerender === "object"
            ? { ...(typeof merged.prerender === "object" ? merged.prerender : {}), ...current.prerender }
            : (current.prerender ?? merged.prerender),
    };
  }, {});
}
