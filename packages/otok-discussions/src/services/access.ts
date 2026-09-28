import type { DiscussionsRuntime } from "../config.js";
import { assertThreadAcceptsReplies, resolveEffectiveThreadStatus } from "../domain/index.js";
import type { DiscussionActor, DiscussionComment, DiscussionSubject, DiscussionThread } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import type {
  ActorResolver,
  DiscussionAdapter,
  DiscussionPolicy,
  DiscussionPolicyAction,
  ModerationProvider,
  SubjectResolver,
} from "../types/ports.js";
import { requireAdapterPort } from "../types/ports.js";
import type { DiscussionRequestContext } from "./types.js";

export interface DiscussionAccessDeps {
  adapter: DiscussionAdapter;
  runtime: DiscussionsRuntime;
  subjectResolver: SubjectResolver;
  actorResolver: ActorResolver;
  policy: DiscussionPolicy;
  moderation: ModerationProvider;
}

export class DiscussionAccess {
  constructor(private readonly deps: DiscussionAccessDeps) {}

  get read() {
    return requireAdapterPort(this.deps.adapter, "read", "read");
  }

  get mutate() {
    return requireAdapterPort(this.deps.adapter, "mutate", "mutate");
  }

  get moderate() {
    return requireAdapterPort(this.deps.adapter, "moderate", "moderate");
  }

  nowIso(): string {
    return this.deps.runtime.deps.clock.now().toISOString();
  }

  async resolveSubject(ctx: DiscussionRequestContext): Promise<DiscussionSubject> {
    const subject = await this.deps.subjectResolver.resolve({
      tenantId: ctx.tenantId,
      subjectType: ctx.subjectType,
      subjectId: ctx.subjectId,
    });
    if (subject.tenantId !== ctx.tenantId) {
      throw new DiscussionError("SUBJECT_DENIED", "Resolved subject tenant does not match request tenant");
    }
    if (subject.subjectType !== ctx.subjectType || subject.subjectId !== ctx.subjectId) {
      throw new DiscussionError("SUBJECT_DENIED", "Resolved subject identity mismatch");
    }
    return subject;
  }

  async resolveActor(ctx: DiscussionRequestContext): Promise<DiscussionActor | null> {
    if (!ctx.sessionUserId) return null;
    const actor = await this.deps.actorResolver.resolveActor({ userId: ctx.sessionUserId });
    if (!actor || actor.id !== ctx.sessionUserId) {
      throw new DiscussionError("FORBIDDEN", "Actor identity could not be verified");
    }
    return actor;
  }

  async requireActor(ctx: DiscussionRequestContext): Promise<DiscussionActor> {
    const actor = await this.resolveActor(ctx);
    if (!actor) {
      throw new DiscussionError("ACTOR_REQUIRED", "Authentication is required for this action");
    }
    return actor;
  }

  async assertPolicy(
    action: DiscussionPolicyAction,
    subject: DiscussionSubject,
    actor: DiscussionActor | null,
    extra?: { thread?: DiscussionThread; comment?: DiscussionComment },
  ): Promise<void> {
    const allowed = await this.deps.policy.can(
      { subject, actor, thread: extra?.thread, comment: extra?.comment },
      action,
    );
    if (!allowed) {
      throw new DiscussionError("FORBIDDEN", `Policy denied action ${action}`);
    }
  }

  async isModerator(actor: DiscussionActor, subject: DiscussionSubject): Promise<boolean> {
    return this.deps.moderation.isModerator(actor, subject);
  }

  async loadThread(subject: DiscussionSubject, threadId: string): Promise<DiscussionThread> {
    const thread = await this.read.getThread(subject, threadId);
    if (!thread) {
      throw new DiscussionError("NOT_FOUND", "Thread not found");
    }
    return this.materializeThread(thread);
  }

  materializeThread(thread: DiscussionThread): DiscussionThread {
    const effective = resolveEffectiveThreadStatus(thread, this.nowIso());
    if (effective === thread.status) return thread;
    return {
      ...thread,
      status: effective,
      closedAt: effective === "closed" && !thread.closedAt ? this.nowIso() : thread.closedAt,
      updatedAt: this.nowIso(),
    };
  }

  assertThreadAllowsMutation(thread: DiscussionThread): void {
    const materialized = this.materializeThread(thread);
    assertThreadAcceptsReplies(materialized, this.nowIso());
  }

  async loadComment(subject: DiscussionSubject, commentId: string): Promise<DiscussionComment> {
    const comment = await this.read.getComment(subject, commentId);
    if (!comment) {
      throw new DiscussionError("NOT_FOUND", "Comment not found");
    }
    return comment;
  }
}
