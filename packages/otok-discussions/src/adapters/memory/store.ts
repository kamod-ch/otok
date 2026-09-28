import type { DiscussionStorePort, ThreadCountDelta } from "../discussion-store-port.js";
import type {
  CommentRevision,
  DiscussionComment,
  DiscussionSubject,
  DiscussionThread,
  ModerationAction,
  Reaction,
  Report,
} from "../../types/domain.js";
import { DiscussionError } from "../../types/errors.js";

export const MEMORY_ADAPTER_LOCALITY =
  "Process-local only. Not safe across workers, serverless instances, or horizontal scale." as const;

function subjectKey(subject: DiscussionSubject): string {
  return `${subject.tenantId}:${subject.subjectType}:${subject.subjectId}`;
}

/**
 * In-memory store for dev/tests. Mutations are serialized on the current event loop tick only.
 */
export class MemoryDiscussionStore implements DiscussionStorePort {
  readonly threads = new Map<string, DiscussionThread>();
  readonly comments = new Map<string, DiscussionComment>();
  readonly reactions = new Map<string, Reaction>();
  readonly reports = new Map<string, Report>();
  readonly revisions = new Map<string, CommentRevision[]>();
  readonly moderationActions: ModerationAction[] = [];
  readonly blocks = new Map<string, { tenantId: string; blockerId: string; blockedId: string; createdAt: string }>();

  /** Active reaction per commentId:actorId */
  private readonly reactionActorKeys = new Map<string, string>();
  /** Open report dedupe: targetType:targetId:reporterId */
  private readonly openReportKeys = new Set<string>();

  assertSubject(subject: DiscussionSubject, entitySubject: DiscussionSubject): void {
    if (subjectKey(subject) !== subjectKey(entitySubject)) {
      throw new DiscussionError("FORBIDDEN", "Subject scope mismatch");
    }
  }

  async runAtomic<T>(fn: () => T | Promise<T>): Promise<T> {
    return fn();
  }

  async findThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionThread | null> {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    this.assertSubject(subject, thread.subject);
    return structuredClone(thread);
  }

  async listThreadsForSubject(subject: DiscussionSubject): Promise<DiscussionThread[]> {
    const key = subjectKey(subject);
    return [...this.threads.values()]
      .filter((t) => subjectKey(t.subject) === key)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => structuredClone(t));
  }

  async saveThread(thread: DiscussionThread): Promise<void> {
    this.threads.set(thread.id, structuredClone(thread));
  }

  async findComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment | null> {
    const comment = this.comments.get(commentId);
    if (!comment) return null;
    this.assertSubject(subject, comment.subject);
    return structuredClone(comment);
  }

  async listCommentsForThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionComment[]> {
    return [...this.comments.values()]
      .filter((c) => c.threadId === threadId && subjectKey(c.subject) === subjectKey(subject))
      .map((c) => structuredClone(c));
  }

  async saveComment(comment: DiscussionComment): Promise<void> {
    this.comments.set(comment.id, structuredClone(comment));
  }

  async updateCommentIfRevision(
    subject: DiscussionSubject,
    commentId: string,
    expectedRevision: number,
    patch: Partial<DiscussionComment> & Pick<DiscussionComment, "revision" | "updatedAt">,
  ): Promise<boolean> {
    const existing = await this.findComment(subject, commentId);
    if (!existing || existing.revision !== expectedRevision) return false;
    await this.saveComment({ ...existing, ...patch });
    return true;
  }

  async bumpThreadCounts(threadId: string, delta: ThreadCountDelta): Promise<DiscussionThread | null> {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    const next: DiscussionThread = {
      ...thread,
      replyCount: Math.max(0, thread.replyCount + (delta.reply ?? 0)),
      pendingCount: Math.max(0, thread.pendingCount + (delta.pending ?? 0)),
      updatedAt: thread.updatedAt,
    };
    this.threads.set(threadId, next);
    return structuredClone(next);
  }

  async addRevision(revision: CommentRevision): Promise<void> {
    const list = this.revisions.get(revision.commentId) ?? [];
    list.push(structuredClone(revision));
    this.revisions.set(revision.commentId, list);
  }

  async listRevisions(commentId: string): Promise<CommentRevision[]> {
    return [...(this.revisions.get(commentId) ?? [])];
  }

  reactionActorKey(commentId: string, actorId: string): string {
    return `${commentId}:${actorId}`;
  }

  async upsertReaction(reaction: Reaction): Promise<{ replacedEmoji: string | null }> {
    const actorKey = this.reactionActorKey(reaction.commentId, reaction.actorId);
    const existingId = this.reactionActorKeys.get(actorKey);
    if (existingId) {
      const existing = this.reactions.get(existingId);
      if (existing?.emoji === reaction.emoji) {
        return { replacedEmoji: reaction.emoji };
      }
      if (existing) {
        this.reactions.delete(existingId);
        this.reactionActorKeys.delete(actorKey);
        this.reactions.set(reaction.id, structuredClone(reaction));
        this.reactionActorKeys.set(actorKey, reaction.id);
        return { replacedEmoji: existing.emoji };
      }
    }
    this.reactionActorKeys.set(actorKey, reaction.id);
    this.reactions.set(reaction.id, structuredClone(reaction));
    return { replacedEmoji: null };
  }

  async removeReaction(subject: DiscussionSubject, reactionId: string, actorId: string): Promise<Reaction | null> {
    const reaction = this.reactions.get(reactionId);
    if (!reaction) return null;
    if (reaction.actorId !== actorId) {
      throw new DiscussionError("FORBIDDEN", "Cannot remove another user's reaction");
    }
    const comment = this.comments.get(reaction.commentId);
    if (comment) this.assertSubject(subject, comment.subject);
    this.reactions.delete(reactionId);
    this.reactionActorKeys.delete(this.reactionActorKey(reaction.commentId, actorId));
    return structuredClone(reaction);
  }

  async listReactionsForComment(commentId: string): Promise<Reaction[]> {
    return [...this.reactions.values()].filter((r) => r.commentId === commentId);
  }

  reportDedupeKey(targetType: string, targetId: string, reporterId: string): string {
    return `${targetType}:${targetId}:${reporterId}`;
  }

  async saveReport(report: Report): Promise<void> {
    const dedupe = this.reportDedupeKey(report.targetType, report.targetId, report.reporterId);
    if (this.openReportKeys.has(dedupe)) {
      throw new DiscussionError("CONFLICT", "An open report already exists for this target and reporter");
    }
    this.openReportKeys.add(dedupe);
    this.reports.set(report.id, structuredClone(report));
  }

  async appendModerationAction(action: ModerationAction): Promise<void> {
    this.moderationActions.push(structuredClone(action));
  }

  async listReportsForTarget(targetType: string, targetId: string): Promise<Report[]> {
    return [...this.reports.values()].filter((r) => r.targetType === targetType && r.targetId === targetId);
  }

  async listOpenReportsForTenant(tenantId: string): Promise<Report[]> {
    return [...this.reports.values()].filter((r) => r.subject.tenantId === tenantId && r.status === "open");
  }

  async listModerationActionsForTarget(tenantId: string, targetType: string, targetId: string): Promise<ModerationAction[]> {
    return this.moderationActions.filter(
      (a) => a.tenantId === tenantId && a.targetType === targetType && a.targetId === targetId,
    );
  }

  async listCommentsByTenant(tenantId: string): Promise<DiscussionComment[]> {
    return [...this.comments.values()].filter((c) => c.subject.tenantId === tenantId);
  }

  blockKey(tenantId: string, blockerId: string, blockedId: string): string {
    return `${tenantId}:${blockerId}:${blockedId}`;
  }

  async saveBlock(tenantId: string, blockerId: string, blockedId: string): Promise<void> {
    const key = this.blockKey(tenantId, blockerId, blockedId);
    this.blocks.set(key, { tenantId, blockerId, blockedId, createdAt: new Date().toISOString() });
  }

  async isUserBlocked(tenantId: string, blockerScope: string, userId: string): Promise<boolean> {
    return this.blocks.has(this.blockKey(tenantId, blockerScope, userId));
  }
}
