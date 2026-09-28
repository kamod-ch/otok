export type {
  CommentRevision,
  CommentSort,
  CommentStatus,
  CursorPage,
  DiscussionActor,
  DiscussionComment,
  DiscussionSubject,
  DiscussionThread,
  DiscussionThreadStatus,
  ModerationAction,
  ModerationActionType,
  ModerationMode,
  Reaction,
  Report,
  ReportStatus,
} from "./types/domain.js";

export { DiscussionError, type DiscussionErrorCode } from "./types/errors.js";

export type {
  ModerationApplyCommand,
  ModerationBulkApplyCommand,
  ModerationBulkApplyResult,
  ModerationCommentDetail,
  ModerationQueueItem,
  ModerationQueueQuery,
} from "./types/moderation.js";
export { authorTrustLevelFromRoles, resolveInitialStatusFromTrust } from "./moderation/trust.js";
export { MODERATION_REASON_CODES } from "./moderation/reason-codes.js";
export { processCommentBodyForStorage } from "./security/process-body.js";
export { createCapabilityRateLimiter } from "./security/rate-limit.js";
export {
  buildThreadCacheInvalidation,
  discussionTenantCacheTag,
  discussionThreadCacheTag,
  publicDiscussionCacheEligible,
} from "./http/cache-policy.js";
export { redactDiscussionLogRecord } from "./observability/log-redaction.js";
export type { DiscussionsMetrics } from "./observability/metrics.js";
export { DISCUSSION_METRIC_NAMES, NoopDiscussionsMetrics } from "./observability/metrics.js";
export type { RateLimitCapability } from "./types/ports.js";

export {
  createDiscussionsI18n,
  pickDiscussionLocale,
  DISCUSSION_LOCALES,
  discussionLabelsFromI18n,
  discussionMessagesDe,
  discussionMessagesEn,
} from "./i18n/index.js";
export type { DiscussionLocale, DiscussionMessageSchema, DiscussionsI18n } from "./i18n/index.js";

export type {
  ActorResolver,
  ActorResolverContext,
  CreateCommentInput,
  CreateThreadInput,
  DiscussionAdapter,
  DiscussionAdapterCapabilities,
  DiscussionCapabilityKey,
  DiscussionDomainEvent,
  DiscussionModerationPort,
  DiscussionMutationPort,
  DiscussionPolicy,
  DiscussionPolicyAction,
  DiscussionPolicyContext,
  DiscussionReadPort,
  DiscussionTransactionContext,
  DiscussionTransactionPort,
  EventSink,
  Clock,
  IdProvider,
  ListCommentsQuery,
  ListThreadsQuery,
  ModerationProvider,
  RateLimitDecision,
  RateLimitProvider,
  SubjectResolver,
  SubjectResolverContext,
  UpdateCommentInput,
} from "./types/ports.js";

export { requireAdapterPort } from "./types/ports.js";

export {
  createDiscussionsRuntime,
  parseDiscussionsConfig,
  discussionsConfigSchema,
  toDiscussionRules,
  type DiscussionsConfig,
  type DiscussionsConfigInput,
  type DiscussionsRuntime,
  type DiscussionsRuntimeDeps,
} from "./config.js";

export * from "./domain/index.js";

export {
  CommentService,
  DiscussionService,
  ModerationService,
  DiscussionAccess,
  canonicalThreadId,
  filterCommentsForRole,
  projectCommentForRole,
  runSpamCheck,
  type CommentServiceOptions,
  type DiscussionServiceOptions,
  type DiscussionRequestContext,
  type SpamModerationProvider,
  type SpamCheckResult,
  type ProviderFailureBehavior,
} from "./services/index.js";
