import type { Kysely, Transaction } from "kysely";
import type { DiscussionStorePort, ThreadCountDelta } from "../adapters/discussion-store-port.js";
import type {
  CommentRevision,
  DiscussionComment,
  DiscussionSubject,
  DiscussionThread,
  ModerationAction,
  Reaction,
  Report,
} from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import {
  commentToInsertRow,
  rowToComment,
  rowToReaction,
  rowToRevision,
  rowToThread,
  threadToInsertRow,
} from "./mappers.js";
import type { DiscussionsDatabase } from "./schema.js";
import { encodeTenantKey, subjectScopeKey } from "./tenant.js";

type DbOrTrx = Kysely<DiscussionsDatabase> | Transaction<DiscussionsDatabase>;

function isUniqueViolation(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /unique|duplicate|UNIQUE constraint/i.test(msg);
}

export class KyselyDiscussionStore implements DiscussionStorePort {
  private trx: Transaction<DiscussionsDatabase> | null = null;

  constructor(readonly db: Kysely<DiscussionsDatabase>) {}

  private conn(): DbOrTrx {
    return this.trx ?? this.db;
  }

  async runAtomic<T>(fn: () => T | Promise<T>): Promise<T> {
    if (this.trx) return fn();
    return this.db.transaction().execute(async (trx) => {
      this.trx = trx;
      try {
        return await fn();
      } finally {
        this.trx = null;
      }
    });
  }

  async findThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionThread | null> {
    const scope = subjectScopeKey(subject);
    const row = await this.conn()
      .selectFrom("discussions_threads")
      .selectAll()
      .where("id", "=", threadId)
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .executeTakeFirst();
    return row ? rowToThread(row) : null;
  }

  async listThreadsForSubject(subject: DiscussionSubject): Promise<DiscussionThread[]> {
    const scope = subjectScopeKey(subject);
    const rows = await this.conn()
      .selectFrom("discussions_threads")
      .selectAll()
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .orderBy("updated_at desc")
      .execute();
    return rows.map(rowToThread);
  }

  async saveThread(thread: DiscussionThread): Promise<void> {
    const existing = await this.conn()
      .selectFrom("discussions_threads")
      .select(["row_version"])
      .where("id", "=", thread.id)
      .executeTakeFirst();
    if (!existing) {
      await this.conn().insertInto("discussions_threads").values(threadToInsertRow(thread)).execute();
      return;
    }
    const result = await this.conn()
      .updateTable("discussions_threads")
      .set({
        title: thread.title,
        status: thread.status,
        opens_at: thread.opensAt,
        closes_at: thread.closesAt,
        reply_count: thread.replyCount,
        pending_count: thread.pendingCount,
        updated_at: thread.updatedAt,
        closed_at: thread.closedAt,
        archived_at: thread.archivedAt,
        pinned_at: thread.pinnedAt,
        pin_rank: thread.pinRank,
        row_version: existing.row_version + 1,
      })
      .where("id", "=", thread.id)
      .where("row_version", "=", existing.row_version)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows ?? 0) === 0) {
      throw new DiscussionError("CONFLICT", "Thread was modified concurrently");
    }
  }

  async bumpThreadCounts(threadId: string, delta: ThreadCountDelta): Promise<DiscussionThread | null> {
    const replyDelta = delta.reply ?? 0;
    const pendingDelta = delta.pending ?? 0;
    const row = await this.conn()
      .selectFrom("discussions_threads")
      .selectAll()
      .where("id", "=", threadId)
      .executeTakeFirst();
    if (!row) return null;
    if (!replyDelta && !pendingDelta) return rowToThread(row);
    const next = {
      reply_count: Math.max(0, row.reply_count + replyDelta),
      pending_count: Math.max(0, row.pending_count + pendingDelta),
    };
    await this.conn().updateTable("discussions_threads").set(next).where("id", "=", threadId).execute();
    const updated = await this.conn()
      .selectFrom("discussions_threads")
      .selectAll()
      .where("id", "=", threadId)
      .executeTakeFirst();
    return updated ? rowToThread(updated) : null;
  }

  async findComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment | null> {
    const scope = subjectScopeKey(subject);
    const row = await this.conn()
      .selectFrom("discussions_comments")
      .selectAll()
      .where("id", "=", commentId)
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .executeTakeFirst();
    return row ? rowToComment(row) : null;
  }

  async listCommentsForThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionComment[]> {
    const scope = subjectScopeKey(subject);
    const rows = await this.conn()
      .selectFrom("discussions_comments")
      .selectAll()
      .where("thread_id", "=", threadId)
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .execute();
    return rows.map(rowToComment);
  }

  async saveComment(comment: DiscussionComment): Promise<void> {
    const parentRoot =
      comment.parentCommentId === null
        ? null
        : await this.conn()
            .selectFrom("discussions_comments")
            .select(["root_comment_id", "id"])
            .where("id", "=", comment.parentCommentId)
            .executeTakeFirst();
    const rootCommentId =
      comment.depth === 0 ? null : (parentRoot?.root_comment_id ?? parentRoot?.id ?? comment.parentCommentId);

    const existing = await this.conn()
      .selectFrom("discussions_comments")
      .select(["id"])
      .where("id", "=", comment.id)
      .executeTakeFirst();
    const row = commentToInsertRow(comment, rootCommentId);
    if (!existing) {
      await this.conn().insertInto("discussions_comments").values(row).execute();
      return;
    }
    await this.conn()
      .updateTable("discussions_comments")
      .set({
        status: comment.status,
        body_markdown: comment.bodyMarkdown,
        body_html: comment.bodyHtml,
        revision: comment.revision,
        is_placeholder: comment.isPlaceholder ? 1 : 0,
        score_positive: comment.scorePositive,
        score_negative: comment.scoreNegative,
        highlighted_at: comment.highlightedAt,
        updated_at: comment.updatedAt,
        deleted_at: comment.deletedAt,
      })
      .where("id", "=", comment.id)
      .execute();
  }

  async updateCommentIfRevision(
    subject: DiscussionSubject,
    commentId: string,
    expectedRevision: number,
    patch: Partial<DiscussionComment> & Pick<DiscussionComment, "revision" | "updatedAt">,
  ): Promise<boolean> {
    const scope = subjectScopeKey(subject);
    const updates: Record<string, unknown> = {
      revision: patch.revision,
      updated_at: patch.updatedAt,
    };
    if (patch.bodyMarkdown !== undefined) updates.body_markdown = patch.bodyMarkdown;
    if (patch.bodyHtml !== undefined) updates.body_html = patch.bodyHtml;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.deletedAt !== undefined) updates.deleted_at = patch.deletedAt;
    if (patch.isPlaceholder !== undefined) updates.is_placeholder = patch.isPlaceholder ? 1 : 0;

    const result = await this.conn()
      .updateTable("discussions_comments")
      .set(updates)
      .where("id", "=", commentId)
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .where("revision", "=", expectedRevision)
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  }

  async addRevision(revision: CommentRevision): Promise<void> {
    await this.conn()
      .insertInto("discussions_comment_revisions")
      .values({
        id: revision.id,
        comment_id: revision.commentId,
        revision: revision.revision,
        body_markdown: revision.bodyMarkdown,
        edited_by_id: revision.editedById,
        created_at: revision.createdAt,
      })
      .execute();
  }

  async listRevisions(commentId: string): Promise<CommentRevision[]> {
    const rows = await this.conn()
      .selectFrom("discussions_comment_revisions")
      .selectAll()
      .where("comment_id", "=", commentId)
      .orderBy("revision desc")
      .execute();
    return rows.map(rowToRevision);
  }

  async upsertReaction(reaction: Reaction): Promise<{ replacedEmoji: string | null }> {
    const comment = await this.conn()
      .selectFrom("discussions_comments")
      .select(["tenant_key"])
      .where("id", "=", reaction.commentId)
      .executeTakeFirstOrThrow();
    const existing = await this.conn()
      .selectFrom("discussions_reactions")
      .selectAll()
      .where("comment_id", "=", reaction.commentId)
      .where("actor_id", "=", reaction.actorId)
      .executeTakeFirst();
    if (existing) {
      if (existing.emoji === reaction.emoji) {
        return { replacedEmoji: reaction.emoji };
      }
      await this.conn()
        .updateTable("discussions_reactions")
        .set({
          id: reaction.id,
          emoji: reaction.emoji,
          created_at: reaction.createdAt,
        })
        .where("comment_id", "=", reaction.commentId)
        .where("actor_id", "=", reaction.actorId)
        .execute();
      return { replacedEmoji: existing.emoji };
    }
    try {
      await this.conn()
        .insertInto("discussions_reactions")
        .values({
          id: reaction.id,
          comment_id: reaction.commentId,
          tenant_key: comment.tenant_key,
          actor_id: reaction.actorId,
          emoji: reaction.emoji,
          created_at: reaction.createdAt,
        })
        .execute();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DiscussionError("CONFLICT", "Reaction already exists for this actor");
      }
      throw error;
    }
    return { replacedEmoji: null };
  }

  async removeReaction(subject: DiscussionSubject, reactionId: string, actorId: string): Promise<Reaction | null> {
    const scope = subjectScopeKey(subject);
    const row = await this.conn()
      .selectFrom("discussions_reactions")
      .innerJoin("discussions_comments", "discussions_comments.id", "discussions_reactions.comment_id")
      .select([
        "discussions_reactions.id",
        "discussions_reactions.comment_id",
        "discussions_reactions.actor_id",
        "discussions_reactions.emoji",
        "discussions_reactions.created_at",
      ])
      .where("discussions_reactions.id", "=", reactionId)
      .where("discussions_reactions.actor_id", "=", actorId)
      .where("discussions_comments.tenant_key", "=", scope.tenant_key)
      .where("discussions_comments.subject_type", "=", scope.subject_type)
      .where("discussions_comments.subject_id", "=", scope.subject_id)
      .executeTakeFirst();
    if (!row) return null;
    if (row.actor_id !== actorId) {
      throw new DiscussionError("FORBIDDEN", "Cannot remove another user's reaction");
    }
    await this.conn().deleteFrom("discussions_reactions").where("id", "=", reactionId).execute();
    return rowToReaction({
      id: row.id,
      comment_id: row.comment_id,
      tenant_key: scope.tenant_key,
      actor_id: row.actor_id,
      emoji: row.emoji,
      created_at: row.created_at,
    });
  }

  async listReactionsForComment(commentId: string): Promise<Reaction[]> {
    const rows = await this.conn()
      .selectFrom("discussions_reactions")
      .selectAll()
      .where("comment_id", "=", commentId)
      .execute();
    return rows.map(rowToReaction);
  }

  reportDedupeKey(targetType: string, targetId: string, reporterId: string): string {
    return `${targetType}:${targetId}:${reporterId}`;
  }

  async saveReport(report: Report): Promise<void> {
    const scope = subjectScopeKey(report.subject);
    try {
      await this.conn()
        .insertInto("discussions_reports")
        .values({
          id: report.id,
          tenant_key: scope.tenant_key,
          subject_type: scope.subject_type,
          subject_id: scope.subject_id,
          target_type: report.targetType,
          target_id: report.targetId,
          reporter_id: report.reporterId,
          reason: report.reason,
          details: report.details ?? null,
          status: report.status,
          created_at: report.createdAt,
          updated_at: report.updatedAt,
        })
        .execute();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DiscussionError("CONFLICT", "An open report already exists for this target and reporter");
      }
      throw error;
    }
  }

  async appendModerationAction(action: ModerationAction): Promise<void> {
    await this.conn()
      .insertInto("discussions_moderation_actions")
      .values({
        id: action.id,
        tenant_key: encodeTenantKey(action.tenantId),
        actor_id: action.actorId,
        action: action.action,
        target_type: action.targetType,
        target_id: action.targetId,
        metadata: action.metadata ? JSON.stringify(action.metadata) : null,
        created_at: action.createdAt,
      })
      .execute();
  }

  async listReportsForTarget(targetType: string, targetId: string): Promise<Report[]> {
    const rows = await this.conn()
      .selectFrom("discussions_reports")
      .selectAll()
      .where("target_type", "=", targetType)
      .where("target_id", "=", targetId)
      .execute();
    return rows.map((row) => ({
      id: row.id,
      subject: {
        tenantId: row.tenant_key,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
      },
      targetType: row.target_type as Report["targetType"],
      targetId: row.target_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      details: row.details ?? undefined,
      status: row.status as Report["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listOpenReportsForTenant(tenantId: string): Promise<Report[]> {
    const rows = await this.conn()
      .selectFrom("discussions_reports")
      .selectAll()
      .where("tenant_key", "=", encodeTenantKey(tenantId))
      .where("status", "=", "open")
      .execute();
    return rows.map((row) => ({
      id: row.id,
      subject: {
        tenantId,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
      },
      targetType: row.target_type as Report["targetType"],
      targetId: row.target_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      details: row.details ?? undefined,
      status: row.status as Report["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listModerationActionsForTarget(
    tenantId: string,
    targetType: string,
    targetId: string,
  ): Promise<ModerationAction[]> {
    const rows = await this.conn()
      .selectFrom("discussions_moderation_actions")
      .selectAll()
      .where("tenant_key", "=", encodeTenantKey(tenantId))
      .where("target_type", "=", targetType)
      .where("target_id", "=", targetId)
      .orderBy("created_at desc")
      .execute();
    return rows.map((row) => ({
      id: row.id,
      tenantId,
      actorId: row.actor_id,
      action: row.action as ModerationAction["action"],
      targetType: row.target_type as ModerationAction["targetType"],
      targetId: row.target_id,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
      createdAt: row.created_at,
    }));
  }

  async listCommentsByTenant(tenantId: string): Promise<DiscussionComment[]> {
    const rows = await this.conn()
      .selectFrom("discussions_comments")
      .selectAll()
      .where("tenant_key", "=", encodeTenantKey(tenantId))
      .execute();
    return rows.map(rowToComment);
  }

  async saveBlock(tenantId: string, blockerId: string, blockedId: string): Promise<void> {
    await this.conn()
      .insertInto("discussions_blocks")
      .values({
        id: `${tenantId}:${blockerId}:${blockedId}`,
        tenant_key: encodeTenantKey(tenantId),
        blocker_id: blockerId,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async isUserBlocked(tenantId: string, blockerScope: string, userId: string): Promise<boolean> {
    const row = await this.conn()
      .selectFrom("discussions_blocks")
      .select("id")
      .where("tenant_key", "=", encodeTenantKey(tenantId))
      .where("blocker_id", "=", blockerScope)
      .where("blocked_id", "=", userId)
      .executeTakeFirst();
    return Boolean(row);
  }
}
