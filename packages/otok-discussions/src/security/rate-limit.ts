import type { DiscussionSubject } from "../types/domain.js";
import type { RateLimitCapability, RateLimitDecision, RateLimitProvider } from "../types/ports.js";

export interface CapabilityRateLimitConfig {
  windowMs: number;
  limits: Partial<Record<RateLimitCapability, number>>;
}

const DEFAULT_LIMITS: Record<RateLimitCapability, number> = {
  "comment:create": 30,
  "thread:create": 10,
  "reaction:mutate": 120,
  "report:create": 20,
  "moderation:apply": 200,
};

type BucketKey = string;

interface WindowBucket {
  count: number;
  windowStart: number;
}

/**
 * In-process capability limiter for dev/single-node. Use a distributed store in production.
 * Keys primarily on verified actor id; optional anonymous fingerprint is separate and short-lived.
 */
export function createCapabilityRateLimiter(config: CapabilityRateLimitConfig): RateLimitProvider {
  const buckets = new Map<BucketKey, WindowBucket>();
  const windowMs = config.windowMs;

  function checkSync(capability: RateLimitCapability, subject: DiscussionSubject, actorId: string): RateLimitDecision {
    const limit = config.limits[capability] ?? DEFAULT_LIMITS[capability];
    const key = `${capability}|${subject.tenantId}|${actorId}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now };
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) {
      return { allowed: false, retryAfterMs: windowMs - (now - bucket.windowStart) };
    }
    bucket.count += 1;
    return { allowed: true };
  }

  const check = async (
    capability: RateLimitCapability,
    subject: DiscussionSubject,
    actorId: string,
  ): Promise<RateLimitDecision> => checkSync(capability, subject, actorId);

  return {
    checkCreateComment: (subject, actorId) => check("comment:create", subject, actorId),
    checkCreateThread: (subject, actorId) => check("thread:create", subject, actorId),
    checkReaction: (subject, actorId) => check("reaction:mutate", subject, actorId),
    checkReport: (subject, actorId) => check("report:create", subject, actorId),
    checkModeration: (subject, actorId) => check("moderation:apply", subject, actorId),
  };
}

/** Datensparsame Kurzzeit-Fingerprint-Spur — nicht für Auth. */
export function anonymousAbuseBucketKey(parts: { tenantId: string; fingerprint: string }): string {
  return `anon|${parts.tenantId}|${parts.fingerprint.slice(0, 16)}`;
}
