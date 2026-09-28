import type { CommentStatus, DiscussionComment, DiscussionSubject, DiscussionThread, Report } from "./domain.js";

export type ModerationQueueKind = "pending" | "reported" | "auto_flagged" | "all";

export interface ModerationQueueQuery {
  tenantId: string;
  subjectType?: string;
  subjectId?: string;
  threadId?: string;
  /** Comment statuses to include (default depends on queueKind). */
  statuses?: readonly CommentStatus[];
  queueKind?: ModerationQueueKind;
  authorId?: string;
  /** Filter reports by reason prefix/exact match. */
  reportReason?: string;
  /** Minimum comment age in whole hours. */
  minAgeHours?: number;
  /** Maximum comment age in whole hours. */
  maxAgeHours?: number;
  minReportCount?: number;
  cursor?: string;
  limit?: number;
}

export interface ModerationQueueItem {
  commentId: string;
  threadId: string;
  subject: DiscussionSubject;
  authorId: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  queueKind: Exclude<ModerationQueueKind, "all">;
  openReportCount: number;
  latestReportReason?: string;
  threadTitle?: string;
}

export interface ModerationCommentDetail {
  comment: DiscussionComment;
  thread: DiscussionThread;
  subject: DiscussionSubject;
  parent: DiscussionComment | null;
  revisions: import("./domain.js").CommentRevision[];
  reports: Report[];
  actions: import("./domain.js").ModerationAction[];
}

export type ModerationCommentAction = "publish" | "reject" | "hide" | "restore" | "delete" | "anonymize";

export type ModerationThreadAction = "open" | "read_only" | "closed" | "reopen";

export type ModerationBlockAction = "block_user";

export interface ModerationApplyCommand {
  action: ModerationCommentAction | ModerationThreadAction | ModerationBlockAction;
  targetId: string;
  threadId?: string;
  blockUserId?: string;
  reasonCode: string;
  reasonText?: string;
}

export interface ModerationBulkApplyCommand {
  items: ModerationApplyCommand[];
}

export interface ModerationBulkApplyResult {
  results: Array<{ targetId: string; ok: true } | { targetId: string; ok: false; error: string }>;
}
