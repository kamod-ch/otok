import { describe, expect, it } from "vitest";
import { OtokQueueJobError, configureQueueApp, getQueueClient } from "@kamod-ch/otok-queue";
import { createTestProviders } from "../testing/providers.js";
import { createDiscussionsRuntime } from "../config.js";
import { DiscussionEngine } from "../engine/discussion-engine.js";
import { MemoryDiscussionStore } from "../adapters/memory/store.js";
import {
  MemorySubscriptionStore,
  attachNotificationBridge,
  createLogNotificationProvider,
  createNotificationJobHandler,
  createQueueNotificationEnqueue,
  deliverNotificationJob,
} from "./index.js";
import type { NotificationJobPayload } from "./types.js";

const subject = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };

function job(overrides: Partial<NotificationJobPayload> = {}): NotificationJobPayload {
  return {
    deliveryKey: "discussions:notify:reply:c1:parent",
    kind: "reply",
    tenantId: "tenant-a",
    subject,
    threadId: "t1",
    commentId: "c1",
    recipientUserId: "parent",
    actorUserId: "author",
    occurredAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("discussions notifications", () => {
  it("deduplicates duplicate queue delivery via provider idempotency key", async () => {
    const subs = new MemorySubscriptionStore();
    await subs.setPreferences({ tenantId: "tenant-a", userId: "parent", replyOptIn: true });
    const seen = new Set<string>();
    const provider = createLogNotificationProvider({ seenKeys: seen, log: () => {} });
    const handler = createNotificationJobHandler({ provider, subscriptions: subs });
    const payload = job();

    const first = await handler(payload);
    const second = await handler(payload);
    expect(first.status).toBe("delivered");
    expect(second).toEqual({ status: "skipped", reason: "duplicate" });
  });

  it("respects opt-out at delivery time", async () => {
    const subs = new MemorySubscriptionStore();
    const provider = createLogNotificationProvider({ log: () => {} });
    const result = await deliverNotificationJob(provider, subs, job(), {
      idempotencyKey: job().deliveryKey,
      attempt: 1,
    });
    expect(result).toEqual({ status: "skipped", reason: "opt_out" });
  });

  it("skips inactive recipients", async () => {
    const subs = new MemorySubscriptionStore();
    await subs.setPreferences({ tenantId: "tenant-a", userId: "parent", replyOptIn: true });
    const provider = createLogNotificationProvider({ log: () => {} });
    const result = await deliverNotificationJob(provider, subs, job(), {
      idempotencyKey: job().deliveryKey,
      attempt: 1,
      isRecipientActive: async () => false,
    });
    expect(result).toEqual({ status: "skipped", reason: "inactive_recipient" });
  });

  it("enqueues via otok-queue with stable idempotency keys", async () => {
    await configureQueueApp({} as never, { provider: { type: "test" } });
    const queue = getQueueClient<{ "discussions.notify": NotificationJobPayload }>();

    const subs = new MemorySubscriptionStore();
    await subs.setPreferences({ tenantId: "tenant-a", userId: "parent", replyOptIn: true });

    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({}, deps);
    attachNotificationBridge(runtime, {
      subscriptions: subs,
      enqueue: createQueueNotificationEnqueue(queue),
    });
    const engine = new DiscussionEngine(new MemoryDiscussionStore(), runtime);
    const thread = await engine.createThread({ subject, title: "T", createdById: "parent" });
    const root = await engine.createComment({
      subject,
      threadId: thread.id,
      authorId: "parent",
      bodyMarkdown: "root",
    });
    await engine.createComment({
      subject,
      threadId: thread.id,
      authorId: "author",
      parentCommentId: root.id,
      bodyMarkdown: "reply",
    });

    const collected: NotificationJobPayload[] = [];
    await queue.process({
      "discussions.notify": async (payload) => {
        collected.push(payload);
      },
    });
    expect(collected.length).toBeGreaterThan(0);

    const first = await queue.enqueue("discussions.notify", collected[0]!, {
      idempotencyKey: collected[0]!.deliveryKey,
    });
    const second = await queue.enqueue("discussions.notify", collected[0]!, {
      idempotencyKey: collected[0]!.deliveryKey,
    });
    expect(second.id).toBe(first.id);
  });

  it("retries failed delivery when provider marks retryable failure", async () => {
    await configureQueueApp({} as never, {
      provider: { type: "test" },
      retry: { maxAttempts: 3, initialBackoffMs: 0, maxBackoffMs: 0 },
    });
    const queue = getQueueClient<{ "discussions.notify": NotificationJobPayload }>();
    const subs = new MemorySubscriptionStore();
    await subs.setPreferences({ tenantId: "tenant-a", userId: "parent", replyOptIn: true });

    let attempts = 0;
    await queue.enqueue("discussions.notify", job());
    await queue.process({
      "discussions.notify": async () => {
        attempts += 1;
        if (attempts < 2) {
          throw new OtokQueueJobError("transient", true);
        }
      },
    });
    await queue.process({
      "discussions.notify": async () => {
        attempts += 1;
      },
    });
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it("does not enqueue reply notifications without explicit opt-in", async () => {
    await configureQueueApp({} as never, { provider: { type: "test" } });
    const queue = getQueueClient<{ "discussions.notify": NotificationJobPayload }>();

    const subs = new MemorySubscriptionStore();
    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({}, deps);
    attachNotificationBridge(runtime, {
      subscriptions: subs,
      enqueue: createQueueNotificationEnqueue(queue),
    });
    const engine = new DiscussionEngine(new MemoryDiscussionStore(), runtime);
    const thread = await engine.createThread({ subject, title: "T", createdById: "parent" });
    const root = await engine.createComment({
      subject,
      threadId: thread.id,
      authorId: "parent",
      bodyMarkdown: "root",
    });
    await engine.createComment({
      subject,
      threadId: thread.id,
      authorId: "author",
      parentCommentId: root.id,
      bodyMarkdown: "reply",
    });
    const result = await queue.process({ "discussions.notify": async () => {} });
    expect(result.processed).toBe(0);
  });
});
