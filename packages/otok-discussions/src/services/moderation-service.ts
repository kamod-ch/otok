import { buildModerationAuditRecord } from "../moderation/audit.js";
import { createModerationAccess, type ModerationAccess, type ModerationAccessOptions } from "../moderation/access.js";
import { assertModerationReasonCode } from "../moderation/reason-codes.js";
import type { DiscussionStorePort } from "../adapters/discussion-store-port.js";
import type { CommentStatus, DiscussionThreadStatus, ModerationActionType } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import { DiscussionAccess, type DiscussionAccessDeps } from "./access.js";
import { listModerationQueueFromStore } from "./moderation-queue.js";
import type { DiscussionRequestContext, ModerationDecisionCommand } from "./types.js";
import type {
  ModerationApplyCommand,
  ModerationBulkApplyCommand,
  ModerationBulkApplyResult,
  ModerationCommentDetail,
  ModerationQueueQuery,
} from "../types/moderation.js";
import { projectCommentForRole } from "./visibility.js";

import type { RateLimitProvider } from "../types/ports.js";
import { assertModerationRateLimit, assertReportRateLimit } from "./rate-limit-guard.js";
import type { DiscussionsMetrics } from "../observability/metrics.js";
import { DISCUSSION_METRIC_NAMES } from "../observability/metrics.js";

export interface ModerationServiceOptions extends DiscussionAccessDeps {
  store?: DiscussionStorePort;
  moderationAccess?: ModerationAccessOptions;
  rateLimit?: RateLimitProvider;
  metrics?: DiscussionsMetrics;
}

export class ModerationService {
  private readonly access: DiscussionAccess;
  private readonly modAccess: ModerationAccess;

  constructor(private readonly deps: ModerationServiceOptions) {
    this.access = new DiscussionAccess(deps);
    this.modAccess = createModerationAccess(deps.moderationAccess);
  }

  private async resolveCommentSubject(ctx: DiscussionRequestContext, commentId: string) {
    const store = this.deps.store;
    if (store) {
      const found = (await store.listCommentsByTenant(ctx.tenantId)).find((c) => c.id === commentId);
      if (found) return found.subject;
    }
    const subject = await this.access.resolveSubject(ctx);
    return subject;
  }

  private async requireModeratorForComment(ctx: DiscussionRequestContext, commentId: string) {
    const actor = await this.access.requireActor(ctx);
    const subject = await this.resolveCommentSubject(ctx, commentId);
    await this.modAccess.assertSubjectModeration(actor, subject, this.deps.moderation);
    await this.access.assertPolicy("comment:moderate", subject, actor);
    return { subject, actor };
  }

  private async recordAudit(input: Parameters<typeof buildModerationAuditRecord>[0]) {
    return this.access.moderate.recordModerationAction(buildModerationAuditRecord(input));
  }

  async listQueue(ctx: DiscussionRequestContext, query: ModerationQueueQuery) {
    const actor = await this.access.requireActor(ctx);
    await this.modAccess.assertTenantScope(actor, query.tenantId, this.deps.moderation);
    await this.access.assertPolicy("comment:moderate", {
      tenantId: query.tenantId,
      subjectType: query.subjectType ?? ctx.subjectType,
      subjectId: query.subjectId ?? ctx.subjectId,
    }, actor);

    const store = this.deps.store;
    if (!store) {
      throw new DiscussionError("CAPABILITY_MISSING", "Moderation queue requires storePort on createDiscussions()");
    }

    const threads = new Map(
      (await store.listCommentsByTenant(query.tenantId)).map((c) => [c.threadId, c.threadId]),
    );
    const threadsById = new Map<string, import("../types/domain.js").DiscussionThread>();
    for (const threadId of new Set(threads.keys())) {
      const sample = (await store.listCommentsByTenant(query.tenantId)).find((c) => c.threadId === threadId);
      if (!sample) continue;
      const thread = await this.access.read.getThread(sample.subject, threadId);
      if (thread) threadsById.set(threadId, this.access.materializeThread(thread));
    }

    const nowMs = Date.parse(this.access.nowIso());
    return listModerationQueueFromStore(store, query, threadsById, nowMs);
  }

  async getCommentDetail(ctx: DiscussionRequestContext, commentId: string): Promise<ModerationCommentDetail> {
    const { subject, actor } = await this.requireModeratorForComment(ctx, commentId);
    const comment = await this.access.loadComment(subject, commentId);
    const thread = await this.access.loadThread(subject, comment.threadId);
    await this.access.assertPolicy("comment:moderate", subject, actor, { thread, comment });

    const store = this.deps.store;
    const parent = comment.parentCommentId
      ? await this.access.read.getComment(subject, comment.parentCommentId)
      : null;
    const revisions = await this.access.read.listRevisions(subject, commentId);
    const reports = store ? await store.listReportsForTarget("comment", commentId) : [];
    const actions = store
      ? await store.listModerationActionsForTarget(subject.tenantId, "comment", commentId)
      : [];

    return {
      comment: projectCommentForRole(comment, "moderator")!,
      thread,
      subject,
      parent,
      revisions,
      reports,
      actions,
    };
  }

  async decideComment(ctx: DiscussionRequestContext, command: ModerationDecisionCommand) {
    return this.apply(ctx, {
      action: moderationActionFromStatus(command.status),
      targetId: command.commentId,
      reasonCode: command.reasonCode ?? "other",
    });
  }

  async apply(ctx: DiscussionRequestContext, command: ModerationApplyCommand) {
    const reasonCode = assertModerationReasonCode(command.reasonCode);
    const actor = await this.access.requireActor(ctx);
    const rateSubject =
      command.action === "block_user" || !isThreadAction(command.action)
        ? await this.resolveCommentSubject(ctx, command.targetId)
        : await this.access.resolveSubject(ctx);
    await assertModerationRateLimit(this.deps.rateLimit, rateSubject, actor.id, this.deps.metrics);
    const started = Date.now();

    if (command.action === "block_user") {
      const subject = await this.resolveCommentSubject(ctx, command.targetId);
      await this.modAccess.assertSubjectModeration(actor, subject, this.deps.moderation);
      await this.access.assertPolicy("comment:moderate", subject, actor);
      const blockedId = command.blockUserId ?? command.targetId;
      const store = this.deps.store;
      if (!store) throw new DiscussionError("CAPABILITY_MISSING", "block_user requires storePort");
      await store.saveBlock(subject.tenantId, "tenant", blockedId);
      await this.recordAudit({
        tenantId: subject.tenantId,
        actorId: actor.id,
        action: "comment.hide",
        targetType: "comment",
        targetId: blockedId,
        reasonCode,
        reasonText: command.reasonText,
        context: { kind: "user.block" },
      });
      this.deps.metrics?.timing(DISCUSSION_METRIC_NAMES.moderationLatencyMs, Date.now() - started);
      return { ok: true as const };
    }

    if (isThreadAction(command.action)) {
      const threadId = command.threadId ?? command.targetId;
      const subject = await this.access.resolveSubject(ctx);
      await this.modAccess.assertSubjectModeration(actor, subject, this.deps.moderation);
      const thread = await this.access.loadThread(subject, threadId);
      await this.access.assertPolicy("thread:moderate", subject, actor, { thread });
      const to = mapThreadAction(command.action);
      const updated = await this.access.moderate.transitionThread(subject, threadId, to, actor.id);
      await this.recordAudit({
        tenantId: subject.tenantId,
        actorId: actor.id,
        action: threadActionType(to),
        targetType: "thread",
        targetId: threadId,
        reasonCode,
        reasonText: command.reasonText,
        context: { to },
      });
      this.deps.metrics?.timing(DISCUSSION_METRIC_NAMES.moderationLatencyMs, Date.now() - started);
      this.deps.metrics?.increment(DISCUSSION_METRIC_NAMES.moderationApply, { action: command.action });
      return updated;
    }

    const { subject } = await this.requireModeratorForComment(ctx, command.targetId);
    const comment = await this.access.loadComment(subject, command.targetId);
    const thread = await this.access.loadThread(subject, comment.threadId);
    await this.access.assertPolicy("comment:moderate", subject, actor, { thread, comment });

    const toStatus = mapCommentAction(command.action);
    let updated = comment;
    if (command.action === "delete") {
      updated = await this.access.mutate.deleteComment(subject, command.targetId);
    } else if (command.action === "anonymize") {
      updated = await this.anonymizeComment(subject, command.targetId);
    } else {
      updated = await this.access.moderate.setCommentStatus(subject, command.targetId, toStatus, actor.id);
    }

    await this.recordAudit({
      tenantId: subject.tenantId,
      actorId: actor.id,
      action: commentActionType(command.action),
      targetType: "comment",
      targetId: command.targetId,
      reasonCode,
      reasonText: command.reasonText,
      context: { from: comment.status, to: updated.status, threadId: comment.threadId },
    });
    this.deps.metrics?.timing(DISCUSSION_METRIC_NAMES.moderationLatencyMs, Date.now() - started);
    this.deps.metrics?.increment(DISCUSSION_METRIC_NAMES.moderationApply, { action: command.action });
    return updated;
  }

  async applyBulk(ctx: DiscussionRequestContext, command: ModerationBulkApplyCommand): Promise<ModerationBulkApplyResult> {
    const results: ModerationBulkApplyResult["results"] = [];
    for (const item of command.items) {
      try {
        await this.apply(ctx, item);
        results.push({ targetId: item.targetId, ok: true });
      } catch (error) {
        const message = error instanceof DiscussionError ? error.message : "Moderation action failed";
        results.push({ targetId: item.targetId, ok: false, error: message });
      }
    }
    return { results };
  }

  async transitionThread(ctx: DiscussionRequestContext, threadId: string, to: DiscussionThreadStatus) {
    return this.apply(ctx, {
      action: to === "open" ? "open" : to === "read_only" ? "read_only" : to === "closed" ? "closed" : "reopen",
      targetId: threadId,
      threadId,
      reasonCode: "other",
    });
  }

  async createReport(ctx: DiscussionRequestContext, command: import("./types.js").ReportCommand) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    await this.access.assertPolicy("report:create", subject, actor);
    await assertReportRateLimit(this.deps.rateLimit, subject, actor.id, this.deps.metrics);
    const report = await this.access.moderate.createReport({
      subject,
      targetType: command.targetType,
      targetId: command.targetId,
      reporterId: actor.id,
      reason: command.reason,
      details: command.details,
    });
    this.deps.metrics?.increment(DISCUSSION_METRIC_NAMES.reportCreated, { tenantId: subject.tenantId });
    return report;
  }

  async getModerationQueueComment(ctx: DiscussionRequestContext, commentId: string) {
    const detail = await this.getCommentDetail(ctx, commentId);
    return detail.comment;
  }

  private async anonymizeComment(subject: import("../types/domain.js").DiscussionSubject, commentId: string) {
    const existing = await this.access.loadComment(subject, commentId);
    const now = this.access.nowIso();
    const store = this.deps.store;
    if (!store) throw new DiscussionError("CAPABILITY_MISSING", "anonymize requires storePort");
    const ok = await store.updateCommentIfRevision(subject, commentId, existing.revision, {
      authorId: "__anonymized__",
      bodyMarkdown: this.deps.runtime.rules.deletedParentPlaceholder,
      bodyHtml: "",
      isPlaceholder: true,
      status: "deleted",
      revision: existing.revision + 1,
      updatedAt: now,
      deletedAt: now,
    });
    if (!ok) throw new DiscussionError("CONFLICT", "Comment was modified concurrently");
    return { ...existing, authorId: "__anonymized__", status: "deleted" as CommentStatus, isPlaceholder: true };
  }
}

function isThreadAction(action: ModerationApplyCommand["action"]): action is ModerationApplyCommand["action"] {
  return action === "open" || action === "read_only" || action === "closed" || action === "reopen";
}

function mapThreadAction(action: ModerationApplyCommand["action"]): DiscussionThreadStatus {
  switch (action) {
    case "open":
    case "reopen":
      return "open";
    case "read_only":
      return "read_only";
    case "closed":
      return "closed";
    default:
      return "open";
  }
}

function mapCommentAction(action: ModerationApplyCommand["action"]): CommentStatus {
  switch (action) {
    case "publish":
    case "restore":
      return "published";
    case "reject":
      return "rejected";
    case "hide":
      return "hidden";
    case "delete":
    case "anonymize":
      return "deleted";
    default:
      return "published";
  }
}

function moderationActionFromStatus(status: CommentStatus): ModerationApplyCommand["action"] {
  switch (status) {
    case "published":
      return "publish";
    case "pending":
      return "publish";
    case "rejected":
      return "reject";
    case "hidden":
      return "hide";
    case "deleted":
      return "delete";
    default:
      return "publish";
  }
}

function commentActionType(action: ModerationApplyCommand["action"]): ModerationActionType {
  switch (action) {
    case "publish":
    case "restore":
      return "comment.approve";
    case "reject":
      return "comment.reject";
    case "hide":
      return "comment.hide";
    case "delete":
    case "anonymize":
      return "comment.delete";
    default:
      return "comment.approve";
  }
}

function threadActionType(status: DiscussionThreadStatus): ModerationActionType {
  switch (status) {
    case "open":
      return "thread.open";
    case "read_only":
      return "thread.read_only";
    case "closed":
      return "thread.close";
    case "archived":
      return "thread.archive";
    default:
      return "thread.open";
  }
}
