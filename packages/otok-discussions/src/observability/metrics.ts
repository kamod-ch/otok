export interface DiscussionsMetrics {
  increment(name: string, tags?: Record<string, string>): void;
  timing(name: string, durationMs: number, tags?: Record<string, string>): void;
}

export const DISCUSSION_METRIC_NAMES = {
  commentCreated: "discussions.comment.created",
  commentPending: "discussions.comment.pending",
  moderationApply: "discussions.moderation.apply",
  moderationLatencyMs: "discussions.moderation.latency_ms",
  reportCreated: "discussions.report.created",
  mutationError: "discussions.mutation.error",
  rateLimited: "discussions.rate_limited",
} as const;

export class NoopDiscussionsMetrics implements DiscussionsMetrics {
  increment(): void {}
  timing(): void {}
}
