import type {
  CommentRevision,
  DiscussionComment,
  DiscussionSubject,
  DiscussionThread,
  ModerationAction,
  Reaction,
  Report,
} from "../types/domain.js";

export interface ThreadCountDelta {
  reply?: number;
  pending?: number;
}

/** Persistence port used by {@link DiscussionEngine} (memory, Kysely, …). */
export interface DiscussionStorePort {
  runAtomic<T>(fn: () => T | Promise<T>): Promise<T>;

  findThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionThread | null>;
  listThreadsForSubject(subject: DiscussionSubject): Promise<DiscussionThread[]>;
  saveThread(thread: DiscussionThread): Promise<void>;
  bumpThreadCounts(threadId: string, delta: ThreadCountDelta): Promise<DiscussionThread | null>;

  findComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment | null>;
  listCommentsForThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionComment[]>;
  saveComment(comment: DiscussionComment): Promise<void>;
  /**
   * Updates comment when {@link expectedRevision} matches (optimistic edit / moderation).
   * @returns false when no row matched (conflict).
   */
  updateCommentIfRevision(
    subject: DiscussionSubject,
    commentId: string,
    expectedRevision: number,
    patch: Partial<DiscussionComment> & Pick<DiscussionComment, "revision" | "updatedAt">,
  ): Promise<boolean>;

  addRevision(revision: CommentRevision): Promise<void>;
  listRevisions(commentId: string): Promise<CommentRevision[]>;

  /** One active reaction per actor and comment; returns previous emoji when replaced. */
  upsertReaction(reaction: Reaction): Promise<{ replacedEmoji: string | null }>;
  removeReaction(subject: DiscussionSubject, reactionId: string, actorId: string): Promise<Reaction | null>;
  listReactionsForComment(commentId: string): Promise<Reaction[]>;

  saveReport(report: Report): Promise<void>;
  reportDedupeKey(targetType: string, targetId: string, reporterId: string): string;

  appendModerationAction(action: ModerationAction): Promise<void>;

  listReportsForTarget(targetType: string, targetId: string): Promise<Report[]>;
  listOpenReportsForTenant(tenantId: string): Promise<Report[]>;
  listModerationActionsForTarget(tenantId: string, targetType: string, targetId: string): Promise<ModerationAction[]>;
  listCommentsByTenant(tenantId: string): Promise<DiscussionComment[]>;
  saveBlock(tenantId: string, blockerId: string, blockedId: string): Promise<void>;
  isUserBlocked(tenantId: string, blockerScope: string, userId: string): Promise<boolean>;
}
