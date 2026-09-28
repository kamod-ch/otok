import type { DiscussionsRuntime } from "../config.js";
import {
  assertBodyLength,
  assertCommentDepth,
  assertEditWindow,
  assertThreadAcceptsReplies,
  assertThreadTransition,
  commentRankingScore,
  countDeltaForCommentStatus,
  decodeCommentCursor,
  encodeCommentCursor,
  assertCommentCursorScope,
  resolveEffectiveThreadStatus,
  resolveInitialCommentStatus,
  applyCommentTransition,
  applyThreadTransition,
} from "../domain/index.js";
import type { DiscussionStorePort } from "../adapters/discussion-store-port.js";
import type {
  CommentSort,
  CommentStatus,
  CursorPage,
  DiscussionComment,
  DiscussionThread,
  DiscussionThreadStatus,
  Reaction,
  Report,
} from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import type {
  CreateCommentInput,
  CreateThreadInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from "../types/ports.js";
import { processCommentBodyForStorage } from "../security/process-body.js";
import { emitDiscussionEvent } from "../events/emit.js";
import {
  minimalCommentCreatedPayload,
  minimalCommentUpdatedPayload,
  minimalReactionPayload,
  minimalReportPayload,
  minimalStatusPayload,
  subjectRef,
} from "../events/payloads.js";

const RANKING_UP = "👍";
const RANKING_DOWN = "👎";

function rankingDelta(emoji: string): { up: number; down: number } {
  if (emoji === RANKING_UP) return { up: 1, down: 0 };
  if (emoji === RANKING_DOWN) return { up: 0, down: 1 };
  return { up: 0, down: 0 };
}

function applyRankingDelta(comment: DiscussionComment, emoji: string, sign: 1 | -1): DiscussionComment {
  const delta = rankingDelta(emoji);
  if (!delta.up && !delta.down) return comment;
  return {
    ...comment,
    scorePositive: Math.max(0, comment.scorePositive + sign * delta.up),
    scoreNegative: Math.max(0, comment.scoreNegative + sign * delta.down),
    updatedAt: comment.updatedAt,
  };
}

function sortComments(items: DiscussionComment[], sort: CommentSort): DiscussionComment[] {
  const copy = [...items];
  if (sort === "newest") {
    copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  } else if (sort === "oldest") {
    copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  } else {
    copy.sort((a, b) => {
      const scoreDiff = commentRankingScore(b) - commentRankingScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
    });
  }
  return copy;
}

function filterCommentScope(items: DiscussionComment[], query: ListCommentsQuery): DiscussionComment[] {
  if (query.rootsOnly) {
    return items.filter((c) => c.depth === 0);
  }
  if (query.replyToCommentId) {
    return items.filter((c) => c.parentCommentId === query.replyToCommentId);
  }
  return items;
}

function sliceAfterCursor(
  sorted: DiscussionComment[],
  sort: CommentSort,
  cursor: string | undefined,
  subject: DiscussionComment["subject"],
  threadId: string,
): DiscussionComment[] {
  if (!cursor) return sorted;
  const decoded = decodeCommentCursor(cursor);
  assertCommentCursorScope(decoded, subject, threadId, sort);
  const idx = sorted.findIndex((c) => {
    if (c.id !== decoded.anchor.id) return false;
    if (sort === "top") {
      return commentRankingScore(c) === decoded.anchor.score;
    }
    return c.createdAt === decoded.anchor.createdAt;
  });
  return idx >= 0 ? sorted.slice(idx + 1) : sorted;
}

export class DiscussionEngine {
  constructor(
    readonly store: DiscussionStorePort,
    readonly runtime: DiscussionsRuntime,
  ) {}

  private nowIso(): string {
    return this.runtime.deps.clock.now().toISOString();
  }

  async materializeThread(thread: DiscussionThread): Promise<DiscussionThread> {
    const effective = resolveEffectiveThreadStatus(thread, this.nowIso());
    if (effective === thread.status) return thread;
    return this.store.runAtomic(async () => {
      const updated: DiscussionThread = {
        ...thread,
        status: effective,
        closedAt: effective === "closed" && !thread.closedAt ? this.nowIso() : thread.closedAt,
        updatedAt: this.nowIso(),
      };
      assertThreadTransition(thread.status, updated.status);
      await this.store.saveThread(updated);
      return updated;
    });
  }

  async createThread(input: CreateThreadInput): Promise<DiscussionThread> {
    return this.store.runAtomic(async () => {
      const rules = this.runtime.rules;
      assertBodyLength(input.title, rules.maxThreadTitleLength, "Thread title");
      const now = this.nowIso();
      const status = input.status ?? (input.opensAt ? "scheduled" : "open");
      if (input.id) {
        const taken = await this.store.findThread(input.subject, input.id);
        if (taken) {
          throw new DiscussionError("CONFLICT", "Thread id already exists for this subject");
        }
      }
      const thread: DiscussionThread = {
        id: input.id ?? this.runtime.deps.ids.createId("thread"),
        subject: input.subject,
        title: input.title,
        status,
        opensAt: input.opensAt ?? null,
        closesAt: input.closesAt ?? null,
        replyCount: 0,
        pendingCount: 0,
        createdById: input.createdById,
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        archivedAt: null,
        pinnedAt: null,
        pinRank: null,
      };
      await this.store.saveThread(thread);
      return thread;
    });
  }

  private async emit(
    name: string,
    subject: DiscussionComment["subject"],
    payload: Record<string, unknown> | import("../events/payloads.js").MinimalEventPayload,
  ): Promise<void> {
    await emitDiscussionEvent(this.runtime.deps.events, {
      name,
      tenantId: subject.tenantId,
      subject: subjectRef(subject),
      payload: payload as Record<string, unknown>,
      occurredAt: this.nowIso(),
    });
  }

  async createComment(input: CreateCommentInput): Promise<DiscussionComment> {
    return this.store.runAtomic(async () => {
      const rules = this.runtime.rules;
      const processed = processCommentBodyForStorage(input.bodyMarkdown, {
        maxCodePoints: rules.maxCommentLength,
      });

      let thread = await this.store.findThread(input.subject, input.threadId);
      if (!thread) throw new DiscussionError("NOT_FOUND", "Thread not found");
      thread = await this.materializeThread(thread);
      assertThreadAcceptsReplies(thread, this.nowIso());

      let parent: DiscussionComment | null = null;
      if (input.parentCommentId) {
        parent = await this.store.findComment(input.subject, input.parentCommentId);
        if (!parent) throw new DiscussionError("NOT_FOUND", "Parent comment not found");
        if (parent.status === "deleted") {
          throw new DiscussionError("FORBIDDEN", "Cannot reply to a deleted comment branch");
        }
      }

      const depth = assertCommentDepth(parent?.depth ?? null, rules.maxDepth);
      const status =
        input.initialStatus ??
        resolveInitialCommentStatus(rules.moderationMode, input.authorRoles ?? [], rules.trustedRole);
      const now = this.nowIso();
      const comment: DiscussionComment = {
        id: this.runtime.deps.ids.createId("comment"),
        threadId: input.threadId,
        subject: input.subject,
        authorId: input.authorId,
        parentCommentId: input.parentCommentId ?? null,
        status,
        depth,
        bodyMarkdown: processed.bodyMarkdown,
        bodyHtml: processed.bodyHtml,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        isPlaceholder: false,
        scorePositive: 0,
        scoreNegative: 0,
        highlightedAt: null,
      };

      await this.store.saveComment(comment);
      const delta = countDeltaForCommentStatus("deleted", status);
      await this.store.bumpThreadCounts(thread.id, delta);
      void this.emit(
        "discussion.comment.created",
        input.subject,
        minimalCommentCreatedPayload({
          commentId: comment.id,
          threadId: comment.threadId,
          authorId: comment.authorId,
          status: comment.status,
          parentAuthorId: parent?.authorId,
          mentionScanBody: comment.bodyMarkdown.slice(0, 2048),
        }),
      );
      return comment;
    });
  }

  async updateComment(input: UpdateCommentInput): Promise<DiscussionComment> {
    return this.store.runAtomic(async () => {
      const rules = this.runtime.rules;
      const existing = await this.store.findComment(input.subject, input.commentId);
      if (!existing) throw new DiscussionError("NOT_FOUND", "Comment not found");
      if (existing.authorId !== input.editorId) {
        throw new DiscussionError("FORBIDDEN", "Cannot edit comment authored by another user");
      }
      assertEditWindow(existing, this.nowIso(), rules.editWindowMs);
      const processed = processCommentBodyForStorage(input.bodyMarkdown, {
        maxCodePoints: rules.maxCommentLength,
      });

      const now = this.nowIso();
      const nextRevision = existing.revision + 1;
      const ok = await this.store.updateCommentIfRevision(input.subject, input.commentId, existing.revision, {
        bodyMarkdown: processed.bodyMarkdown,
        bodyHtml: processed.bodyHtml,
        revision: nextRevision,
        updatedAt: now,
      });
      if (!ok) {
        throw new DiscussionError("CONFLICT", "Comment was modified concurrently");
      }
      await this.store.addRevision({
        id: this.runtime.deps.ids.createId("rev"),
        commentId: existing.id,
        revision: nextRevision,
        bodyMarkdown: processed.bodyMarkdown,
        editedById: input.editorId,
        createdAt: now,
      });
      void this.emit(
        "discussion.comment.updated",
        input.subject,
        minimalCommentUpdatedPayload({
          commentId: existing.id,
          threadId: existing.threadId,
          revision: nextRevision,
        }),
      );
      return {
        ...existing,
        bodyMarkdown: processed.bodyMarkdown,
        bodyHtml: processed.bodyHtml,
        revision: nextRevision,
        updatedAt: now,
      };
    });
  }

  async setCommentStatus(subject: DiscussionComment["subject"], commentId: string, to: CommentStatus): Promise<DiscussionComment> {
    return this.store.runAtomic(async () => {
      const comment = await this.store.findComment(subject, commentId);
      if (!comment) throw new DiscussionError("NOT_FOUND", "Comment not found");
      const from = comment.status;
      applyCommentTransition(from, to);
      const now = this.nowIso();
      const ok = await this.store.updateCommentIfRevision(subject, commentId, comment.revision, {
        status: to,
        revision: comment.revision,
        updatedAt: now,
        deletedAt: to === "deleted" ? now : comment.deletedAt,
      });
      if (!ok) {
        throw new DiscussionError("CONFLICT", "Comment was modified concurrently");
      }
      const updated: DiscussionComment = {
        ...comment,
        status: to,
        updatedAt: now,
        deletedAt: to === "deleted" ? now : comment.deletedAt,
      };
      const delta = countDeltaForCommentStatus(from, to);
      await this.store.bumpThreadCounts(comment.threadId, delta);
      void this.emit(
        "discussion.comment.status_changed",
        subject,
        minimalStatusPayload({ commentId: updated.id, threadId: updated.threadId, status: to }),
      );
      return updated;
    });
  }

  async deleteCommentWithPlaceholder(subject: DiscussionComment["subject"], commentId: string): Promise<DiscussionComment> {
    return this.store.runAtomic(async () => {
      const comment = await this.store.findComment(subject, commentId);
      if (!comment) throw new DiscussionError("NOT_FOUND", "Comment not found");
      applyCommentTransition(comment.status, "deleted");
      const now = this.nowIso();
      const siblings = await this.store.listCommentsForThread(subject, comment.threadId);
      const hasChildren = siblings.some((c) => c.parentCommentId === commentId && c.status !== "deleted");
      const bodyMarkdown = hasChildren ? this.runtime.rules.deletedParentPlaceholder : comment.bodyMarkdown;
      const ok = await this.store.updateCommentIfRevision(subject, commentId, comment.revision, {
        status: "deleted",
        revision: comment.revision,
        updatedAt: now,
        deletedAt: now,
        bodyMarkdown,
        bodyHtml: "",
        isPlaceholder: hasChildren,
      });
      if (!ok) {
        throw new DiscussionError("CONFLICT", "Comment was modified concurrently");
      }
      const updated: DiscussionComment = {
        ...comment,
        status: "deleted",
        deletedAt: now,
        updatedAt: now,
        bodyMarkdown,
        bodyHtml: "",
        isPlaceholder: hasChildren,
      };
      const delta = countDeltaForCommentStatus(comment.status, "deleted");
      await this.store.bumpThreadCounts(comment.threadId, delta);
      return updated;
    });
  }

  async transitionThread(
    subject: DiscussionComment["subject"],
    threadId: string,
    to: DiscussionThreadStatus,
  ): Promise<DiscussionThread> {
    return this.store.runAtomic(async () => {
      const thread = await this.store.findThread(subject, threadId);
      if (!thread) throw new DiscussionError("NOT_FOUND", "Thread not found");
      applyThreadTransition(thread.status, to);
      const now = this.nowIso();
      const updated: DiscussionThread = {
        ...thread,
        status: to,
        updatedAt: now,
        closedAt: to === "closed" ? now : thread.closedAt,
        archivedAt: to === "archived" ? now : thread.archivedAt,
      };
      await this.store.saveThread(updated);
      return updated;
    });
  }

  async addReaction(subject: DiscussionComment["subject"], commentId: string, actorId: string, emoji: string): Promise<Reaction> {
    return this.store.runAtomic(async () => {
      const comment = await this.store.findComment(subject, commentId);
      if (!comment) throw new DiscussionError("NOT_FOUND", "Comment not found");
      if (comment.status === "deleted") {
        throw new DiscussionError("FORBIDDEN", "Cannot react to deleted comment");
      }
      if (emoji !== RANKING_UP && emoji !== RANKING_DOWN) {
        throw new DiscussionError("INVALID_INPUT", "Unsupported reaction emoji");
      }
      const now = this.nowIso();
      const reaction: Reaction = {
        id: this.runtime.deps.ids.createId("reaction"),
        commentId,
        actorId,
        emoji,
        createdAt: now,
      };
      const { replacedEmoji } = await this.store.upsertReaction(reaction);
      let scores = comment;
      if (replacedEmoji && replacedEmoji !== emoji) {
        scores = applyRankingDelta(scores, replacedEmoji, -1);
      } else if (replacedEmoji === emoji) {
        throw new DiscussionError("CONFLICT", "Reaction already set");
      }
      scores = applyRankingDelta(scores, emoji, 1);
      scores = { ...scores, updatedAt: now };
      if (scores.scorePositive !== comment.scorePositive || scores.scoreNegative !== comment.scoreNegative) {
        await this.store.saveComment(scores);
      }
      void this.emit(
        "discussion.reaction.changed",
        subject,
        minimalReactionPayload({ commentId, threadId: comment.threadId, reactionEmoji: emoji }),
      );
      return reaction;
    });
  }

  async removeReaction(subject: DiscussionComment["subject"], reactionId: string, actorId: string): Promise<void> {
    await this.store.runAtomic(async () => {
      const reaction = await this.store.removeReaction(subject, reactionId, actorId);
      if (!reaction) throw new DiscussionError("NOT_FOUND", "Reaction not found");
      const comment = await this.store.findComment(subject, reaction.commentId);
      if (!comment) throw new DiscussionError("NOT_FOUND", "Comment not found");
      const now = this.nowIso();
      const scores = applyRankingDelta({ ...comment, updatedAt: now }, reaction.emoji, -1);
      if (scores.scorePositive !== comment.scorePositive || scores.scoreNegative !== comment.scoreNegative) {
        await this.store.saveComment(scores);
      }
      void this.emit(
        "discussion.reaction.changed",
        subject,
        minimalReactionPayload({ commentId: comment.id, threadId: comment.threadId, reactionEmoji: "removed" }),
      );
    });
  }

  async createReport(input: {
    subject: DiscussionComment["subject"];
    targetType: "thread" | "comment";
    targetId: string;
    reporterId: string;
    reason: string;
    details?: string;
  }): Promise<Report> {
    return this.store.runAtomic(async () => {
      const now = this.nowIso();
      const report: Report = {
        id: this.runtime.deps.ids.createId("report"),
        subject: input.subject,
        targetType: input.targetType,
        targetId: input.targetId,
        reporterId: input.reporterId,
        reason: input.reason,
        details: input.details,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      await this.store.saveReport(report);
      void this.emit(
        "discussion.report.created",
        input.subject,
        minimalReportPayload({
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          reasonCode: report.reason.slice(0, 64),
        }),
      );
      return report;
    });
  }

  async listComments(query: ListCommentsQuery): Promise<CursorPage<DiscussionComment>> {
    const sort: CommentSort = query.sort ?? "newest";
    const limit = Math.min(query.limit ?? this.runtime.config.pagination.defaultPageSize, 100);
    let items = await this.store.listCommentsForThread(query.subject, query.threadId);
    if (query.statuses?.length) {
      const allowed = new Set(query.statuses);
      items = items.filter((c) => allowed.has(c.status));
    }
    items = filterCommentScope(items, query);
    items = sortComments(items, sort);
    items = sliceAfterCursor(items, sort, query.cursor, query.subject, query.threadId);
    const page = items.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      page.length === limit && last
        ? encodeCommentCursor({
            sort,
            subject: query.subject,
            threadId: query.threadId,
            anchor: {
              id: last.id,
              createdAt: last.createdAt,
              ...(sort === "top" ? { score: commentRankingScore(last) } : {}),
            },
          })
        : undefined;
    return { items: page, nextCursor };
  }
}

/** @deprecated Use {@link DiscussionEngine}. */
export const MemoryDiscussionEngine = DiscussionEngine;
