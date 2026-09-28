import type {
  CommentSort,
  DiscussionActor,
  DiscussionComment,
  DiscussionSubject,
  DiscussionThread,
} from "../types/domain.js";

/** Route + session facts — never trust client-supplied tenant or user ids. */
export interface DiscussionRequestContext {
  tenantId: string;
  subjectType: string;
  subjectId: string;
  sessionUserId: string | null;
}

export interface GetOrCreateThreadInput {
  title: string;
  /** Snapshotted at first create; later config changes do not alter existing threads. */
  opensAt?: string | null;
  closesAt?: string | null;
}

export interface GetThreadResult {
  subject: DiscussionSubject;
  thread: DiscussionThread;
}

export interface ListCommentsInput {
  threadId: string;
  sort?: CommentSort;
  limit?: number;
  cursor?: string;
  rootsOnly?: boolean;
  replyToCommentId?: string;
}

export interface CommentListResult {
  subject: DiscussionSubject;
  thread: DiscussionThread;
  items: DiscussionComment[];
  nextCursor?: string;
}

export interface CreateCommentCommand {
  threadId: string;
  bodyMarkdown: string;
  parentCommentId?: string | null;
}

export interface EditCommentCommand {
  commentId: string;
  bodyMarkdown: string;
}

export interface PermalinkResult {
  subject: DiscussionSubject;
  thread: DiscussionThread;
  comment: DiscussionComment;
}

export interface ReactionCommand {
  commentId: string;
  emoji: string;
}

export interface ReportCommand {
  targetType: "thread" | "comment";
  targetId: string;
  reason: string;
  details?: string;
}

export interface ModerationDecisionCommand {
  commentId: string;
  status: DiscussionComment["status"];
  reasonCode?: string;
}

export interface ResolvedActor {
  actor: DiscussionActor | null;
  subject: DiscussionSubject;
}
