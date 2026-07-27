import type { Context } from "hono";
import { defineMiddleware, type OtokMiddleware } from "otok/server";
import type { RateLimitProvider } from "./types.js";

export function createRateLimitMiddleware(provider: RateLimitProvider, ipHeader = "x-forwarded-for"): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const ip = resolveClientIp(c, ipHeader);
    const result = await provider.check({
      key: ip ?? c.req.header("cf-connecting-ip") ?? "unknown",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      ip,
    });

    if (!result.allowed) {
      if (result.limit != null) c.header("x-ratelimit-limit", String(result.limit));
      if (result.remaining != null) c.header("x-ratelimit-remaining", String(result.remaining));
      if (result.resetAt != null) c.header("x-ratelimit-reset", String(result.resetAt));
      const retry = result.retryAfterSeconds ?? 60;
      c.header("retry-after", String(retry));
      return c.text("Too Many Requests", 429);
    }

    if (result.limit != null) c.header("x-ratelimit-limit", String(result.limit));
    if (result.remaining != null) c.header("x-ratelimit-remaining", String(result.remaining));

    await next();
  });
}

function resolveClientIp(c: Context, header: string): string | undefined {
  const raw = c.req.header(header);
  if (!raw) return undefined;
  return raw.split(",")[0]?.trim();
}

/** In-memory rate limit provider for development and tests. */
export function createMemoryRateLimitProvider(options: {
  limit: number;
  windowMs: number;
}): RateLimitProvider {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(ctx) {
      const now = Date.now();
      const bucket = buckets.get(ctx.key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(ctx.key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, limit: options.limit, remaining: options.limit - 1, resetAt: now + options.windowMs };
      }
      bucket.count += 1;
      if (bucket.count > options.limit) {
        return {
          allowed: false,
          limit: options.limit,
          remaining: 0,
          resetAt: bucket.resetAt,
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        };
      }
      return {
        allowed: true,
        limit: options.limit,
        remaining: options.limit - bucket.count,
        resetAt: bucket.resetAt,
      };
    },
  };
}
