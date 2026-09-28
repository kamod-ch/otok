export { DiscussionAccess, type DiscussionAccessDeps } from "./access.js";
export { canonicalThreadId } from "./canonical-thread.js";
export { CommentService, type CommentServiceOptions } from "./comment-service.js";
export { DiscussionService, type DiscussionServiceOptions } from "./discussion-service.js";
export { ModerationService } from "./moderation-service.js";
export {
  runSpamCheck,
  resolveProviderFailureBehavior,
  type SpamCheckResult,
  type SpamModerationProvider,
  type ProviderFailureBehavior,
  type SpamSignal,
} from "./spam.js";
export type {
  CommentListResult,
  CreateCommentCommand,
  DiscussionRequestContext,
  EditCommentCommand,
  GetOrCreateThreadInput,
  GetThreadResult,
  ListCommentsInput,
  ModerationDecisionCommand,
  PermalinkResult,
  ReactionCommand,
  ReportCommand,
  ResolvedActor,
} from "./types.js";
export {
  filterCommentsForRole,
  isCommentVisibleToRole,
  projectCommentForRole,
  publicListStatuses,
  resolveCommentViewerRole,
  type CommentViewerRole,
} from "./visibility.js";
