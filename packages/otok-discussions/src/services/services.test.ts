import { describe, expect, it, vi } from "vitest";
import { createDiscussionsRuntime } from "../config.js";
import { createMemoryDiscussionAdapter } from "../adapters/memory/index.js";
import { createTestProviders } from "../testing/providers.js";
import {
  actorDirectory,
  allowPolicy,
  denyAnonymousReadPolicy,
  mappingSubjectResolver,
  memoryAdapterStore,
  moderationForTenants,
  staticSubjectResolver,
} from "../testing/service-fixtures.js";
import { CommentService } from "./comment-service.js";
import { DiscussionService } from "./discussion-service.js";
import { ModerationService } from "./moderation-service.js";
import type { SpamModerationProvider } from "./spam.js";
import { canonicalThreadId } from "./canonical-thread.js";

const subjectA = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const subjectB = { tenantId: "tenant-b", subjectType: "job", subjectId: "job-1" };

const user1: import("../types/domain.js").DiscussionActor = {
  id: "user-1",
  displayName: "One",
  roles: [],
};
const user2: import("../types/domain.js").DiscussionActor = {
  id: "user-2",
  displayName: "Two",
  roles: [],
};
const modA: import("../types/domain.js").DiscussionActor = {
  id: "mod-a",
  displayName: "Mod A",
  roles: ["moderator"],
};

function ctx(tenantId: string, userId: string | null) {
  return { tenantId, subjectType: "job", subjectId: "job-1", sessionUserId: userId };
}

function buildServices(options?: { spam?: SpamModerationProvider; policy?: import("../types/ports.js").DiscussionPolicy }) {
  const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
  const runtime = createDiscussionsRuntime({ editWindowMs: 60_000, moderationMode: "post", maxDepth: 3 }, deps);
  const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
  const base = {
    adapter,
    runtime,
    subjectResolver: staticSubjectResolver(subjectA),
    actorResolver: actorDirectory({ "user-1": user1, "user-2": user2, "mod-a": modA }),
    policy: options?.policy ?? allowPolicy(),
    moderation: moderationForTenants("tenant-a"),
  };
  return {
    deps,
    discussion: new DiscussionService(base),
    comments: new CommentService({ ...base, spamProvider: options?.spam }),
    moderation: new ModerationService({ ...base, store: memoryAdapterStore(adapter) }),
    adapter,
  };
}

describe("DiscussionService", () => {
  it("getOrCreateThread is idempotent and snapshots schedule fields", async () => {
    const { discussion } = buildServices();
    const first = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), {
      title: "Feedback",
      opensAt: "2026-07-01T00:00:00.000Z",
      closesAt: "2026-08-01T00:00:00.000Z",
    });
    const second = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), {
      title: "Ignored title",
      opensAt: "2099-01-01T00:00:00.000Z",
    });
    expect(second.thread.id).toBe(first.thread.id);
    expect(second.thread.opensAt).toBe("2026-07-01T00:00:00.000Z");
    expect(second.thread.closesAt).toBe("2026-08-01T00:00:00.000Z");
    expect(first.thread.id).toBe(canonicalThreadId(subjectA));
  });

  it("resolves concurrent getOrCreate without duplicate threads", async () => {
    const { discussion } = buildServices();
    const [a, b] = await Promise.all([
      discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "A" }),
      discussion.getOrCreateThread(ctx("tenant-a", "user-2"), { title: "B" }),
    ]);
    expect(a.thread.id).toBe(b.thread.id);
  });
});

describe("CommentService", () => {
  it("denies anonymous read when policy requires auth", async () => {
    const { discussion, comments } = buildServices({ policy: denyAnonymousReadPolicy() });
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    await expect(
      comments.listComments(ctx("tenant-a", null), { threadId: thread.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows anonymous read when policy permits", async () => {
    const { discussion, comments } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "hello",
    });
    const page = await comments.listComments(ctx("tenant-a", null), { threadId: thread.id });
    expect(page.items).toHaveLength(1);
  });

  it("rejects TOCTOU submit on thread closed after render", async () => {
    const { deps, discussion, comments, moderation } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), {
      title: "T",
      closesAt: "2026-06-01T13:00:00.000Z",
    });
    deps.clock.set("2026-06-01T12:30:00.000Z");
    await moderation.transitionThread(ctx("tenant-a", "mod-a"), thread.id, "closed");
    deps.clock.set("2026-06-01T14:00:00.000Z");
    await expect(
      comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "late" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids editing another author's comment", async () => {
    const { discussion, comments } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "mine",
    });
    await expect(
      comments.editComment(ctx("tenant-a", "user-2"), { commentId: comment.id, bodyMarkdown: "hack" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces edit window server-side", async () => {
    const { deps, discussion, comments } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "old",
    });
    deps.clock.advanceMs(120_000);
    await expect(
      comments.editComment(ctx("tenant-a", "user-1"), { commentId: comment.id, bodyMarkdown: "new" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks reply to deleted parent branch", async () => {
    const { discussion, comments } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const parent = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "parent",
    });
    await comments.createComment(ctx("tenant-a", "user-2"), {
      threadId: thread.id,
      parentCommentId: parent.id,
      bodyMarkdown: "child",
    });
    await comments.deleteComment(ctx("tenant-a", "user-1"), parent.id);
    await expect(
      comments.createComment(ctx("tenant-a", "user-2"), {
        threadId: thread.id,
        parentCommentId: parent.id,
        bodyMarkdown: "nope",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hides pending comments from public list but not from author", async () => {
    const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
    const runtime = createDiscussionsRuntime({ moderationMode: "pre" }, deps);
    const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
    const base = {
      adapter,
      runtime,
      subjectResolver: staticSubjectResolver(subjectA),
      actorResolver: actorDirectory({ "user-1": user1 }),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a"),
    };
    const discussion = new DiscussionService(base);
    const comments = new CommentService(base);
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    await comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "pending" });
    const publicView = await comments.listComments(ctx("tenant-a", null), { threadId: thread.id });
    expect(publicView.items).toHaveLength(0);
    const authorView = await comments.listComments(ctx("tenant-a", "user-1"), { threadId: thread.id });
    expect(authorView.items).toHaveLength(1);
  });

  it("fail-closed spam provider blocks create in pre mode config path", async () => {
    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({ moderationMode: "pre" }, deps);
    const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
    const spam: SpamModerationProvider = {
      checkComment: vi.fn(async () => {
        throw new Error("timeout");
      }),
    };
    const base = {
      adapter,
      runtime,
      subjectResolver: staticSubjectResolver(subjectA),
      actorResolver: actorDirectory({ "user-1": user1 }),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a"),
    };
    const discussion = new DiscussionService(base);
    const comments = new CommentService({ ...base, spamProvider: spam });
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    await expect(
      comments.createComment(ctx("tenant-a", "user-1"), { threadId: thread.id, bodyMarkdown: "x" }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("fail-open spam provider allows create on post mode", async () => {
    const spam: SpamModerationProvider = {
      checkComment: vi.fn(async () => {
        throw new Error("timeout");
      }),
    };
    const { discussion, comments } = buildServices({ spam });
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "ok",
    });
    expect(comment.bodyMarkdown).toBe("ok");
  });
});

describe("ModerationService", () => {
  it("denies moderator from another tenant subject", async () => {
    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({}, deps);
    const adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
    const base = {
      adapter,
      runtime,
      subjectResolver: mappingSubjectResolver({
        "tenant-a:job:job-1": subjectA,
        "tenant-b:job:job-1": subjectB,
      }),
      actorResolver: actorDirectory({ "mod-a": modA }),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a", "tenant-b"),
    };
    const discussionA = new DiscussionService({
      ...base,
      subjectResolver: staticSubjectResolver(subjectA),
      actorResolver: actorDirectory({ "user-1": user1, "mod-a": modA }),
    });
    const commentsA = new CommentService({ ...base, subjectResolver: staticSubjectResolver(subjectA), actorResolver: actorDirectory({ "user-1": user1 }) });
    const moderationB = new ModerationService({
      ...base,
      subjectResolver: staticSubjectResolver(subjectB),
      store: memoryAdapterStore(adapter),
    });
    const { thread } = await discussionA.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await commentsA.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "c",
    });
    await expect(
      moderationB.decideComment(ctx("tenant-b", "mod-a"), { commentId: comment.id, status: "hidden" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records moderation decision and changes visibility", async () => {
    const { discussion, comments, moderation } = buildServices();
    const { thread } = await discussion.getOrCreateThread(ctx("tenant-a", "user-1"), { title: "T" });
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "bad",
    });
    await moderation.decideComment(ctx("tenant-a", "mod-a"), {
      commentId: comment.id,
      status: "hidden",
      reasonCode: "spam",
    });
    const publicView = await comments.listComments(ctx("tenant-a", null), { threadId: thread.id });
    expect(publicView.items).toHaveLength(0);
    const modView = await moderation.getModerationQueueComment(ctx("tenant-a", "mod-a"), comment.id);
    expect(modView.status).toBe("hidden");
  });
});

describe("visibility", () => {
  it("maps rejected to author-only", async () => {
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
    const comment = await comments.createComment(ctx("tenant-a", "user-1"), {
      threadId: thread.id,
      bodyMarkdown: "x",
    });
    await moderation.decideComment(ctx("tenant-a", "mod-a"), { commentId: comment.id, status: "rejected" });
    await expect(comments.resolvePermalink(ctx("tenant-a", null), comment.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const author = await comments.resolvePermalink(ctx("tenant-a", "user-1"), comment.id);
    expect(author.comment.status).toBe("rejected");
  });
});
