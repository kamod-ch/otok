import { DiscussionError } from "../types/errors.js";
import type { DiscussionSubject } from "../types/domain.js";
import type { RateLimitProvider } from "../types/ports.js";
import type { DiscussionsMetrics } from "../observability/metrics.js";
import { DISCUSSION_METRIC_NAMES } from "../observability/metrics.js";

export async function assertRateLimit(
  provider: RateLimitProvider | undefined,
  check: (p: RateLimitProvider) => Promise<{ allowed: boolean; retryAfterMs?: number }>,
  metrics?: DiscussionsMetrics,
): Promise<void> {
  if (!provider) return;
  const decision = await check(provider);
  if (!decision.allowed) {
    metrics?.increment(DISCUSSION_METRIC_NAMES.rateLimited);
    throw new DiscussionError("RATE_LIMITED", "Rate limit exceeded");
  }
}

export async function assertReactionRateLimit(
  provider: RateLimitProvider | undefined,
  subject: DiscussionSubject,
  actorId: string,
  metrics?: DiscussionsMetrics,
): Promise<void> {
  if (!provider?.checkReaction) return;
  await assertRateLimit(provider, (p) => p.checkReaction!(subject, actorId), metrics);
}

export async function assertReportRateLimit(
  provider: RateLimitProvider | undefined,
  subject: DiscussionSubject,
  actorId: string,
  metrics?: DiscussionsMetrics,
): Promise<void> {
  if (!provider?.checkReport) return;
  await assertRateLimit(provider, (p) => p.checkReport!(subject, actorId), metrics);
}

export async function assertModerationRateLimit(
  provider: RateLimitProvider | undefined,
  subject: DiscussionSubject,
  actorId: string,
  metrics?: DiscussionsMetrics,
): Promise<void> {
  if (!provider?.checkModeration) return;
  await assertRateLimit(provider, (p) => p.checkModeration!(subject, actorId), metrics);
}
