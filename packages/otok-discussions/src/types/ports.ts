import type {
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
  Reaction,
  Report,
} from "./domain.js";
import { DiscussionError } from "./errors.js";

export interface DiscussionAdapterCapabilities {
  read: boolean;
  mutate: boolean;
  moderate: boolean;
  transactional: boolean;
}

export interface ListThreadsQuery {
  subject: DiscussionSubject;
  limit?: number;
  cursor?: string;
}

export interface ListCommentsQuery {
  threadId: string;
  subject: DiscussionSubject;
  sort?: CommentSort;
  limit?: number;
  cursor?: string;
  /** When set, only comments with these statuses are returned. */
  statuses?: readonly CommentStatus[];
  /** When true, only depth-0 comments (thread roots). */
  rootsOnly?: boolean;
  /** When set, only direct replies to this parent comment. */
  replyToCommentId?: string;
}

export interface CreateThreadInput {
  subject: DiscussionSubject;
  title: string;
  createdById: string;
  /** When set (e.g. canonical subject thread), used for concurrency-safe get-or-create. */
  id?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  status?: DiscussionThreadStatus;
}

export interface CreateCommentInput {
  subject: DiscussionSubject;
  threadId: string;
  authorId: string;
  authorRoles?: readonly string[];
  parentCommentId?: string | null;
  bodyMarkdown: string;
  /** Server-side override (e.g. spam review); skips default moderation mode resolution when set. */
  initialStatus?: CommentStatus;
}

export interface UpdateCommentInput {
  subject: DiscussionSubject;
  commentId: string;
  editorId: string;
  bodyMarkdown: string;
}

export interface DiscussionReadPort {
  getThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionThread | null>;
  listThreads(query: ListThreadsQuery): Promise<CursorPage<DiscussionThread>>;
  getComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment | null>;
  listComments(query: ListCommentsQuery): Promise<CursorPage<DiscussionComment>>;
  listRevisions(subject: DiscussionSubject, commentId: string): Promise<CommentRevision[]>;
  listReactions(subject: DiscussionSubject, commentId: string): Promise<Reaction[]>;
}

export interface DiscussionMutationPort {
  createThread(input: CreateThreadInput): Promise<DiscussionThread>;
  createComment(input: CreateCommentInput): Promise<DiscussionComment>;
  updateComment(input: UpdateCommentInput): Promise<DiscussionComment>;
  deleteComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment>;
  addReaction(subject: DiscussionSubject, commentId: string, actorId: string, emoji: string): Promise<Reaction>;
  removeReaction(subject: DiscussionSubject, reactionId: string, actorId: string): Promise<void>;
}

export interface DiscussionModerationPort {
  setCommentStatus(
    subject: DiscussionSubject,
    commentId: string,
    status: CommentStatus,
    moderatorId: string,
  ): Promise<DiscussionComment>;
  transitionThread(
    subject: DiscussionSubject,
    threadId: string,
    to: DiscussionThreadStatus,
    moderatorId: string,
  ): Promise<DiscussionThread>;
  pinThread(
    subject: DiscussionSubject,
    threadId: string,
    moderatorId: string,
    pinRank?: number,
  ): Promise<DiscussionThread>;
  unpinThread(subject: DiscussionSubject, threadId: string, moderatorId: string): Promise<DiscussionThread>;
  highlightComment(subject: DiscussionSubject, commentId: string, moderatorId: string): Promise<DiscussionComment>;
  createReport(input: {
    subject: DiscussionSubject;
    targetType: "thread" | "comment";
    targetId: string;
    reporterId: string;
    reason: string;
    details?: string;
  }): Promise<Report>;
  recordModerationAction(action: Omit<ModerationAction, "id" | "createdAt">): Promise<ModerationAction>;
}

export interface DiscussionTransactionContext {
  read: DiscussionReadPort;
  mutate: DiscussionMutationPort;
  moderate?: DiscussionModerationPort;
}

export interface DiscussionTransactionPort {
  run<T>(fn: (ctx: DiscussionTransactionContext) => Promise<T>): Promise<T>;
}

export interface DiscussionAdapter {
  readonly capabilities: DiscussionAdapterCapabilities;
  readonly read?: DiscussionReadPort;
  readonly mutate?: DiscussionMutationPort;
  readonly moderate?: DiscussionModerationPort;
  readonly transaction?: DiscussionTransactionPort;
}

export type DiscussionCapabilityKey = keyof DiscussionAdapterCapabilities;

type AdapterPortMap = {
  read: DiscussionReadPort;
  mutate: DiscussionMutationPort;
  moderate: DiscussionModerationPort;
  transaction: DiscussionTransactionPort;
};

export function requireAdapterPort<P extends keyof AdapterPortMap>(
  adapter: DiscussionAdapter,
  capability: DiscussionCapabilityKey,
  port: P,
): AdapterPortMap[P] {
  if (!adapter.capabilities[capability]) {
    throw discussionCapabilityError(capability, port);
  }
  const value = adapter[port];
  if (!value) {
    throw discussionCapabilityError(capability, port);
  }
  return value as AdapterPortMap[P];
}

function discussionCapabilityError(capability: DiscussionCapabilityKey, port: string): DiscussionError {
  return new DiscussionError(
    "CAPABILITY_MISSING",
    `Adapter does not expose ${port} (capability "${capability}" is false)`,
  );
}

export type SubjectResolverContext = {
  tenantId: string;
  subjectType: string;
  subjectId: string;
};

export interface SubjectResolver {
  resolve(ctx: SubjectResolverContext): Promise<DiscussionSubject>;
}

export interface ActorResolverContext {
  userId: string;
}

export interface ActorResolver {
  resolveActor(ctx: ActorResolverContext): Promise<DiscussionActor | null>;
}

export type DiscussionPolicyAction =
  | "thread:read"
  | "thread:create"
  | "comment:read"
  | "comment:create"
  | "comment:edit-own"
  | "comment:moderate"
  | "thread:moderate"
  | "report:create";

export interface DiscussionPolicyContext {
  subject: DiscussionSubject;
  actor: DiscussionActor | null;
  thread?: DiscussionThread;
  comment?: DiscussionComment;
}

export interface DiscussionPolicy {
  can(ctx: DiscussionPolicyContext, action: DiscussionPolicyAction): boolean | Promise<boolean>;
}

export interface ModerationProvider {
  isModerator(actor: DiscussionActor, subject: DiscussionSubject): boolean | Promise<boolean>;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs?: number;
}

export type RateLimitCapability =
  | "comment:create"
  | "thread:create"
  | "reaction:mutate"
  | "report:create"
  | "moderation:apply";

export interface RateLimitProvider {
  checkCreateComment(subject: DiscussionSubject, actorId: string): Promise<RateLimitDecision>;
  checkCreateThread(subject: DiscussionSubject, actorId: string): Promise<RateLimitDecision>;
  checkReaction?(subject: DiscussionSubject, actorId: string): Promise<RateLimitDecision>;
  checkReport?(subject: DiscussionSubject, actorId: string): Promise<RateLimitDecision>;
  checkModeration?(subject: DiscussionSubject, actorId: string): Promise<RateLimitDecision>;
}

export interface DiscussionDomainEvent {
  name: string;
  tenantId: string;
  subject: DiscussionSubject;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface EventSink {
  emit(event: DiscussionDomainEvent): void | Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdProvider {
  createId(prefix?: string): string;
}
