/** Scoped resource discussions attach to (never trust client-supplied tenantId alone). */
export interface DiscussionSubject {
  tenantId: string;
  subjectType: string;
  subjectId: string;
}

export interface DiscussionActor {
  id: string;
  displayName: string;
  avatarUrl?: string;
  roles: readonly string[];
}

export type DiscussionThreadStatus = "scheduled" | "open" | "read_only" | "closed" | "archived";

export type CommentStatus = "pending" | "published" | "rejected" | "hidden" | "deleted";

export type CommentSort = "newest" | "oldest" | "top";

export type ModerationMode = "pre" | "post" | "trusted";

export interface DiscussionThread {
  id: string;
  subject: DiscussionSubject;
  title: string;
  status: DiscussionThreadStatus;
  opensAt: string | null;
  closesAt: string | null;
  replyCount: number;
  pendingCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  archivedAt: string | null;
  /** Editorial pin — independent of community ranking. */
  pinnedAt: string | null;
  pinRank: number | null;
}

export interface DiscussionComment {
  id: string;
  threadId: string;
  subject: DiscussionSubject;
  authorId: string;
  parentCommentId: string | null;
  status: CommentStatus;
  depth: number;
  bodyMarkdown: string;
  bodyHtml: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Shown when parent is deleted but thread keeps tree shape. */
  isPlaceholder: boolean;
  /** Community ranking inputs (not editorial highlight). */
  scorePositive: number;
  scoreNegative: number;
  /** Editorial highlight — does not affect Wilson ranking. */
  highlightedAt: string | null;
}

export interface CommentRevision {
  id: string;
  commentId: string;
  revision: number;
  bodyMarkdown: string;
  editedById: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  commentId: string;
  actorId: string;
  emoji: string;
  createdAt: string;
}

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  subject: DiscussionSubject;
  targetType: "thread" | "comment";
  targetId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export type ModerationActionType =
  | "comment.approve"
  | "comment.reject"
  | "comment.hide"
  | "comment.restore"
  | "comment.delete"
  | "thread.open"
  | "thread.read_only"
  | "thread.close"
  | "thread.archive"
  | "thread.pin"
  | "thread.unpin"
  | "report.resolve"
  | "report.dismiss";

export interface ModerationAction {
  id: string;
  tenantId: string;
  actorId: string;
  action: ModerationActionType;
  targetType: "thread" | "comment" | "report";
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}
