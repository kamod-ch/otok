import type { AiPluginOptions } from "../types.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface AiRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function createAiRateLimiter(options: { windowMs: number; max: number }) {
  return {
    check(key: string): AiRateLimitResult {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= options.max) {
        return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
      }
      bucket.count += 1;
      return { allowed: true, remaining: options.max - bucket.count, resetAt: bucket.resetAt };
    },
    reset(key?: string) {
      if (key) buckets.delete(key);
      else buckets.clear();
    },
  };
}

export function resolveAiRateLimitKey(options: Pick<AiPluginOptions, "rateLimit">, userId?: string, ip?: string): string {
  return userId ?? ip ?? "anonymous";
}

/** @internal */
export function resetAiRateLimiters(): void {
  buckets.clear();
}
