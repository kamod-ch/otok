import type { RateLimitProvider } from "../types/ports.js";
import { DiscussionError } from "../types/errors.js";
import { DiscussionAccess, type DiscussionAccessDeps } from "./access.js";
import { canonicalThreadId } from "./canonical-thread.js";
import type { DiscussionRequestContext, GetOrCreateThreadInput, GetThreadResult } from "./types.js";

export interface DiscussionServiceOptions extends DiscussionAccessDeps {
  rateLimit?: RateLimitProvider;
}

export class DiscussionService {
  private readonly access: DiscussionAccess;

  constructor(private readonly options: DiscussionServiceOptions) {
    this.access = new DiscussionAccess(options);
  }

  async getThread(ctx: DiscussionRequestContext, threadId: string): Promise<GetThreadResult> {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.resolveActor(ctx);
    const thread = await this.access.loadThread(subject, threadId);
    await this.access.assertPolicy("thread:read", subject, actor, { thread });
    return { subject, thread };
  }

  /**
   * Concurrency-safe canonical thread per subject. Competing creators race on a stable id;
   * the loser loads the winner's row.
   */
  async getOrCreateThread(ctx: DiscussionRequestContext, input: GetOrCreateThreadInput): Promise<GetThreadResult> {
    const subject = await this.access.resolveSubject(ctx);
    const actor = await this.access.resolveActor(ctx);
    await this.access.assertPolicy("thread:read", subject, actor);

    const id = canonicalThreadId(subject);
    const existing = await this.access.read.getThread(subject, id);
    if (existing) {
      return { subject, thread: this.access.materializeThread(existing) };
    }

    const creator = await this.access.requireActor(ctx);
    await this.access.assertPolicy("thread:create", subject, creator);
    if (this.options.rateLimit) {
      const decision = await this.options.rateLimit.checkCreateThread(subject, creator.id);
      if (!decision.allowed) {
        throw new DiscussionError("RATE_LIMITED", "Thread creation rate limit exceeded");
      }
    }

    const opensAt = input.opensAt ?? null;
    const closesAt = input.closesAt ?? null;
    const status = opensAt ? "scheduled" : "open";

    try {
      const thread = await this.access.mutate.createThread({
        id,
        subject,
        title: input.title,
        createdById: creator.id,
        opensAt,
        closesAt,
        status,
      });
      return { subject, thread: this.access.materializeThread(thread) };
    } catch (error) {
      if (error instanceof DiscussionError && error.code === "CONFLICT") {
        const raced = await this.access.read.getThread(subject, id);
        if (raced) {
          return { subject, thread: this.access.materializeThread(raced) };
        }
      }
      throw error;
    }
  }
}
