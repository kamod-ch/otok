import { describe, expect, it } from "vitest";
import { createDiscussionsRuntime } from "./config.js";
import { createMemoryDiscussionAdapter } from "./adapters/memory/index.js";
import { createTestProviders } from "./testing/providers.js";
import {
  actorDirectory,
  allowPolicy,
  memoryAdapterStore,
  moderationForTenants,
  staticSubjectResolver,
} from "./testing/service-fixtures.js";
import { CommentService } from "./services/comment-service.js";
import { DiscussionService } from "./services/discussion-service.js";
import { ModerationService } from "./services/moderation-service.js";
import { resolveInitialStatusFromTrust } from "./moderation/trust.js";
import { resolveEffectiveThreadStatus } from "./domain/rules.js";

const subjectA = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const user1 = { id: "user-1", displayName: "One", roles: [] as string[] };
const modA = { id: "mod-a", displayName: "Mod", roles: ["moderator"] as string[] };

function ctx(tenantId: string, userId: string | null) {
  return { tenantId, subjectType: "job", subjectId: "job-1", sessionUserId: userId };
}

describe("moderation lifecycle", () => {
  it("trust defaults to standard when app omits trust level", () => {
    expect(resolveInitialStatusFromTrust({ moderationMode: "post" })).toBe("published");
    expect(resolveInitialStatusFromTrust({ moderationMode: "pre" })).toBe("pending");
  });

  it("auto-closes thread on access when closesAt passed", () => {
    const thread = {
      id: "t1",
      subject: subjectA,
      title: "T",
      status: "open" as const,
      opensAt: null,
      closesAt: "2026-01-01T00:00:00.000Z",
      replyCount: 0,
      pendingCount: 0,
      createdById: "u1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      closedAt: null,
      archivedAt: null,
      pinnedAt: null,
      pinRank: null,
    };
    expect(resolveEffectiveThreadStatus(thread, "2026-06-01T00:00:00.000Z")).toBe("closed");
  });

  it("lists queue without leaking other tenant comments", async () => {
    const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
    const runtime = createDiscussionsRuntime({ moderationMode: "pre" }, deps);
    const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
    const base = {
      adapter,
      runtime,
      subjectResolver: staticSubjectResolver(subjectA),
      actorResolver: actorDirectory({ "user-1": user1, "mod-a": modA }),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a"),
    };
    const discussion = new DiscussionService(base);
    const comments = new CommentService(base);
    const moderation = new ModerationService({ ...base, store: memoryAdapterStore(adapter) });
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    await comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "pending one" });
    const page = await moderation.listQueue(ctx("tenant-a", "mod-a"), {
      tenantId: "tenant-a",
      queueKind: "pending",
    });
    expect(page.items.length).toBeGreaterThan(0);
    await expect(
      moderation.listQueue(ctx("tenant-b", "mod-a"), { tenantId: "tenant-b", queueKind: "all" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bulk moderation surfaces partial failures", async () => {
    const { discussion, comments, moderation } = (() => {
      const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
      const runtime = createDiscussionsRuntime({}, deps);
      const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
      const base = {
        adapter,
        runtime,
        subjectResolver: staticSubjectResolver(subjectA),
        actorResolver: actorDirectory({ "user-1": user1, "mod-a": modA }),
        policy: allowPolicy(),
        moderation: moderationForTenants("tenant-a"),
      };
      return {
        discussion: new DiscussionService(base),
        comments: new CommentService(base),
        moderation: new ModerationService({ ...base, store: memoryAdapterStore(adapter) }),
      };
    })();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const c1 = await comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "a" });
    const result = await moderation.applyBulk(ctx("tenant-a", "mod-a"), {
      items: [
        { action: "hide", targetId: c1.id, reasonCode: "spam" },
        { action: "hide", targetId: "missing-comment", reasonCode: "spam" },
      ],
    });
    expect(result.results.filter((r) => r.ok)).toHaveLength(1);
    expect(result.results.filter((r) => !r.ok)).toHaveLength(1);
  });

  it("records audit metadata for moderation apply", async () => {
    const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
    const runtime = createDiscussionsRuntime({}, deps);
    const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
    const base = {
      adapter,
      runtime,
      subjectResolver: staticSubjectResolver(subjectA),
      actorResolver: actorDirectory({ "user-1": user1, "mod-a": modA }),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a"),
    };
    const discussion = new DiscussionService(base);
    const comments = new CommentService(base);
    const moderation = new ModerationService({ ...base, store: memoryAdapterStore(adapter) });
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "x" });
    await moderation.apply(ctx("tenant-a", "mod-a"), {
      action: "hide",
      targetId: comment.id,
      reasonCode: "abuse",
      reasonText: "insult",
    });
    const detail = await moderation.getCommentDetail(ctx("tenant-a", "mod-a"), comment.id);
    expect(detail.actions.some((a) => a.metadata?.reasonCode === "abuse")).toBe(true);
  });
});
