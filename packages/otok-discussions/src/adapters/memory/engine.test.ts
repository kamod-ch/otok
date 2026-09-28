import { describe, expect, it } from "vitest";
import { createDiscussionsRuntime } from "../../config.js";
import { DiscussionEngine } from "../../engine/discussion-engine.js";
import { DiscussionError } from "../../types/errors.js";
import { createTestProviders } from "../../testing/providers.js";
import { createMemoryDiscussionAdapter } from "./adapter.js";
import { MemoryDiscussionStore } from "./store.js";

function setup(config?: Record<string, unknown>) {
  const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
  const runtime = createDiscussionsRuntime(
    { maxDepth: 2, editWindowMs: 60_000, moderationMode: "post", ...config },
    deps,
  );
  const store = new MemoryDiscussionStore();
  const engine = new DiscussionEngine(store, runtime);
  const adapter = createMemoryDiscussionAdapter({ deps, config, store });
  return { deps, runtime, store, engine, adapter };
}

const subjectA = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const subjectB = { tenantId: "tenant-b", subjectType: "job", subjectId: "job-1" };

describe("DiscussionEngine (memory store)", () => {
  it("isolates tenants with identical subject ids", async () => {
    const { engine, store } = setup();
    const tA = await engine.createThread({ subject: subjectA, title: "A", createdById: "u1" });
    await engine.createThread({ subject: subjectB, title: "B", createdById: "u2" });
    expect(await store.listThreadsForSubject(subjectA)).toHaveLength(1);
    await expect(store.findThread(subjectB, tA.id)).rejects.toThrow(DiscussionError);
  });

  it("enforces maxDepth", async () => {
    const { engine } = setup({ maxDepth: 1 });
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const root = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "root",
    });
    const child = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      parentCommentId: root.id,
      bodyMarkdown: "child",
    });
    await expect(
      engine.createComment({
        subject: subjectA,
        threadId: thread.id,
        authorId: "u1",
        parentCommentId: child.id,
        bodyMarkdown: "too deep",
      }),
    ).rejects.toThrow(DiscussionError);
  });

  it("auto-closes thread when closesAt passed", async () => {
    const { engine, deps, store } = setup();
    deps.clock.set("2026-06-01T10:00:00.000Z");
    const thread = await engine.createThread({
      subject: subjectA,
      title: "T",
      createdById: "u1",
      closesAt: "2026-06-01T11:00:00.000Z",
    });
    deps.clock.set("2026-06-01T12:00:00.000Z");
    const stored = (await store.findThread(subjectA, thread.id))!;
    const materialized = await engine.materializeThread(stored);
    expect(materialized.status).toBe("closed");
  });

  it("paginates top sort with scoped cursor", async () => {
    const { engine } = setup();
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const c1 = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "one",
    });
    const c2 = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u2",
      bodyMarkdown: "two",
    });
    await engine.addReaction(subjectA, c2.id, "u3", "👍");
    await engine.addReaction(subjectA, c2.id, "u4", "👍");
    const page1 = await engine.listComments({ subject: subjectA, threadId: thread.id, sort: "top", limit: 1 });
    expect(page1.items[0]?.id).toBe(c2.id);
    const page2 = await engine.listComments({
      subject: subjectA,
      threadId: thread.id,
      sort: "top",
      limit: 1,
      cursor: page1.nextCursor,
    });
    expect(page2.items[0]?.id).toBe(c1.id);
  });

  it("rejects duplicate reactions and reports", async () => {
    const { engine } = setup();
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const comment = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "hi",
    });
    await engine.addReaction(subjectA, comment.id, "u2", "👍");
    await expect(engine.addReaction(subjectA, comment.id, "u2", "👍")).rejects.toThrow(DiscussionError);
    await engine.createReport({
      subject: subjectA,
      targetType: "comment",
      targetId: comment.id,
      reporterId: "u3",
      reason: "spam",
    });
    await expect(
      engine.createReport({
        subject: subjectA,
        targetType: "comment",
        targetId: comment.id,
        reporterId: "u3",
        reason: "spam",
      }),
    ).rejects.toThrow(DiscussionError);
  });

  it("switches reaction emoji without double active reactions", async () => {
    const { engine, store } = setup();
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const comment = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "hi",
    });
    await engine.addReaction(subjectA, comment.id, "u2", "👍");
    await engine.addReaction(subjectA, comment.id, "u2", "👎");
    const reactions = await store.listReactionsForComment(comment.id);
    expect(reactions).toHaveLength(1);
    expect(reactions[0]?.emoji).toBe("👎");
    const updated = (await store.findComment(subjectA, comment.id))!;
    expect(updated.scorePositive).toBe(0);
    expect(updated.scoreNegative).toBe(1);
  });

  it("updates counters atomically in-process when approving pending comment", async () => {
    const { engine, store } = setup({ moderationMode: "pre" });
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const comment = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "awaiting",
    });
    const stored = (await store.findThread(subjectA, thread.id))!;
    expect(stored.pendingCount).toBe(1);
    expect(stored.replyCount).toBe(1);
    await engine.setCommentStatus(subjectA, comment.id, "published");
    const after = (await store.findThread(subjectA, thread.id))!;
    expect(after.pendingCount).toBe(0);
    expect(after.replyCount).toBe(1);
  });

  it("uses placeholder when deleting parent with children", async () => {
    const { engine, store } = setup({ maxDepth: 3, deletedParentPlaceholder: "[removed]" });
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const parent = await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "parent",
    });
    await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u2",
      parentCommentId: parent.id,
      bodyMarkdown: "child",
    });
    await engine.deleteCommentWithPlaceholder(subjectA, parent.id);
    const updated = (await store.findComment(subjectA, parent.id))!;
    expect(updated.isPlaceholder).toBe(true);
    expect(updated.bodyMarkdown).toBe("[removed]");
  });
});
