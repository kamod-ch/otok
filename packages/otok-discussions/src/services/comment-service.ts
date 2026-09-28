import type { CommentStatus } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import type { RateLimitProvider } from "../types/ports.js";
import { DiscussionAccess, type DiscussionAccessDeps } from "./access.js";
import { runSpamCheck, type ProviderFailureBehavior, type SpamModerationProvider } from "./spam.js";
import type {
  CommentListResult,
  CreateCommentCommand,
  DiscussionRequestContext,
  EditCommentCommand,
  ListCommentsInput,
  PermalinkResult,
  ReactionCommand,
} from "./types.js";
import { filterCommentsForRole, projectCommentForRole, publicListStatuses, resolveCommentViewerRole } from "./visibility.js";
import { assertReactionRateLimit } from "./rate-limit-guard.js";
import type { DiscussionsMetrics } from "../observability/metrics.js";
import { DISCUSSION_METRIC_NAMES } from "../observability/metrics.js";

export interface CommentServiceOptions extends DiscussionAccessDeps {
  rateLimit?: RateLimitProvider;
  metrics?: DiscussionsMetrics;
  spamProvider?: SpamModerationProvider;
  spamFailureBehavior?: Partial<Record<import("../types/domain.js").ModerationMode, ProviderFailureBehavior>>;
}

export class CommentService {
  private readonly access: DiscussionAccess;

  constructor(private readonly options: CommentServiceOptions) {
    this.access = new DiscussionAccess(options);
  }

  async listComments(ctx: DiscussionRequestContext, input: ListCommentsInput): Promise<CommentListResult> {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.resolveActor(ctx);
    const thread = await this.access.loadThread(subject, input.threadId);
    await this.access.assertPolicy("comment:read", subject, actor, { thread });

    const isMod = actor ? await this.access.isModerator(actor, subject) : false;
    const page = await this.access.read.listComments({
      subject,
      threadId: input.threadId,
      sort: input.sort,
      limit: input.limit,
      cursor: input.cursor,
      rootsOnly: input.rootsOnly,
      replyToCommentId: input.replyToCommentId,
      statuses: isMod || actor ? undefined : publicListStatuses(),
    });

    const items = filterCommentsForRole(page.items, actor, isMod);
    return { subject, thread, items, nextCursor: page.nextCursor };
  }

  async resolvePermalink(ctx: DiscussionRequestContext, commentId: string): Promise<PermalinkResult> {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.resolveActor(ctx);
    const comment = await this.access.loadComment(subject, commentId);
    const thread = await this.access.loadThread(subject, comment.threadId);
    await this.access.assertPolicy("comment:read", subject, actor, { thread, comment });

    const isMod = actor ? await this.access.isModerator(actor, subject) : false;
    const role = resolveCommentViewerRole(comment, actor, isMod);
    const projected = projectCommentForRole(comment, role);
    if (!projected) {
      throw new DiscussionError("NOT_FOUND", "Comment not available");
    }
    return { subject, thread, comment: projected };
  }

  async createComment(ctx: DiscussionRequestContext, command: CreateCommentCommand) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    let thread = await this.access.loadThread(subject, command.threadId);
    await this.access.assertPolicy("comment:create", subject, actor, { thread });

    this.access.assertThreadAllowsMutation(thread);
    thread = await this.access.loadThread(subject, command.threadId);

    if (this.options.rateLimit) {
      const decision = await this.options.rateLimit.checkCreateComment(subject, actor.id);
      if (!decision.allowed) {
        throw new DiscussionError("RATE_LIMITED", "Comment creation rate limit exceeded");
      }
    }

    const spam = await runSpamCheck(
      this.options.spamProvider,
      {
        tenantId: subject.tenantId,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        authorId: actor.id,
        bodyMarkdown: command.bodyMarkdown,
      },
      this.options.runtime.config.moderationMode,
      this.options.spamFailureBehavior,
    );

    if (spam?.signal === "block") {
      throw new DiscussionError("FORBIDDEN", `Comment blocked (${spam.reasonCode})`);
    }

    const initialStatus: CommentStatus | undefined = spam?.signal === "review" ? "pending" : undefined;

    const created = await this.access.mutate.createComment({
      subject,
      threadId: command.threadId,
      authorId: actor.id,
      authorRoles: actor.roles,
      parentCommentId: command.parentCommentId ?? null,
      bodyMarkdown: command.bodyMarkdown,
      initialStatus,
    });
    this.options.metrics?.increment(DISCUSSION_METRIC_NAMES.commentCreated, {
      tenantId: subject.tenantId,
      status: created.status,
    });
    if (created.status === "pending") {
      this.options.metrics?.increment(DISCUSSION_METRIC_NAMES.commentPending, { tenantId: subject.tenantId });
    }
    return created;
  }

  async editComment(ctx: DiscussionRequestContext, command: EditCommentCommand) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    const existing = await this.access.loadComment(subject, command.commentId);
    const thread = await this.access.loadThread(subject, existing.threadId);
    await this.access.assertPolicy("comment:edit-own", subject, actor, { thread, comment: existing });

    if (existing.authorId !== actor.id) {
      throw new DiscussionError("FORBIDDEN", "Cannot edit another author's comment");
    }

    this.access.assertThreadAllowsMutation(thread);

    return this.access.mutate.updateComment({
      subject,
      commentId: command.commentId,
      editorId: actor.id,
      bodyMarkdown: command.bodyMarkdown,
    });
  }

  async deleteComment(ctx: DiscussionRequestContext, commentId: string) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    const existing = await this.access.loadComment(subject, commentId);
    const thread = await this.access.loadThread(subject, existing.threadId);
    const isMod = await this.access.isModerator(actor, subject);

    if (isMod) {
      await this.access.assertPolicy("comment:moderate", subject, actor, { thread, comment: existing });
    } else {
      await this.access.assertPolicy("comment:edit-own", subject, actor, { thread, comment: existing });
      if (existing.authorId !== actor.id) {
        throw new DiscussionError("FORBIDDEN", "Cannot delete another author's comment");
      }
    }

    this.access.assertThreadAllowsMutation(thread);
    return this.access.mutate.deleteComment(subject, commentId);
  }

  async addReaction(ctx: DiscussionRequestContext, command: ReactionCommand) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    const comment = await this.access.loadComment(subject, command.commentId);
    const thread = await this.access.loadThread(subject, comment.threadId);
    await this.access.assertPolicy("comment:read", subject, actor, { thread, comment });
    this.access.assertThreadAllowsMutation(thread);
    await assertReactionRateLimit(this.options.rateLimit, subject, actor.id, this.options.metrics);
    return this.access.mutate.addReaction(subject, command.commentId, actor.id, command.emoji);
  }

  async removeReaction(ctx: DiscussionRequestContext, reactionId: string) {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.requireActor(ctx);
    await this.access.assertPolicy("comment:read", subject, actor);
    return this.access.mutate.removeReaction(subject, reactionId, actor.id);
  }
}
