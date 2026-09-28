import { describe, expect, it, vi } from "vitest";
import { RealtimeHub, createMemoryProvider } from "@kamod-ch/otok-realtime";
import { configureRealtimeApp } from "@kamod-ch/otok-realtime/plugin";
import { Hono } from "hono";
import { createTestProviders } from "../testing/providers.js";
import { createDiscussionsRuntime } from "../config.js";
import { DiscussionEngine } from "../engine/discussion-engine.js";
import { MemoryDiscussionStore } from "../adapters/memory/store.js";
import {
  attachLiveUpdatesBridge,
  createDiscussionsLiveChannel,
  discussionThreadRoomKey,
  toDiscussionLiveEvent,
} from "./index.js";

const subjectA = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const subjectB = { tenantId: "tenant-b", subjectType: "job", subjectId: "job-1" };

function accessForTenant(tenantId: string) {
  return createDiscussionsLiveChannel({
    canAccessThread: ({ user, tenantId: tid }) => Boolean(user?.id && tid === tenantId),
  });
}

describe("discussions live (otok-realtime contract)", () => {
  it("maps domain events to minimal public payloads without moderation fields", () => {
    const live = toDiscussionLiveEvent({
      name: "discussion.comment.created",
      tenantId: "tenant-a",
      subject: subjectA,
      occurredAt: "2026-06-01T12:00:00.000Z",
      payload: {
        commentId: "c1",
        threadId: "t1",
        authorId: "u1",
        status: "pending",
        reasonCode: "spam",
      },
    });
    expect(live).toBeNull();

    const published = toDiscussionLiveEvent({
      name: "discussion.comment.created",
      tenantId: "tenant-a",
      subject: subjectA,
      occurredAt: "2026-06-01T12:00:00.000Z",
      payload: {
        commentId: "c1",
        threadId: "t1",
        authorId: "u1",
        status: "published",
        parentAuthorId: "secret-parent",
        mentionScanBody: "@friend hello",
      },
    });
    expect(published).toEqual({
      v: 1,
      name: "discussion.comment.created",
      tenantId: "tenant-a",
      subjectType: "job",
      subjectId: "job-1",
      threadId: "t1",
      commentId: "c1",
      occurredAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("isolates tenants on channel authorize", async () => {
    const channel = accessForTenant("tenant-a");
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    const roomA = discussionThreadRoomKey(subjectA, "thread-1");
    const roomB = discussionThreadRoomKey(subjectB, "thread-1");

    await expect(
      hub.connect({
        user: { id: "alice" },
        channel,
        room: roomA,
        transport: "sse",
        push: () => true,
        onClose: () => {},
      }),
    ).resolves.toBeDefined();

    await expect(
      hub.connect({
        user: { id: "alice" },
        channel,
        room: roomB,
        transport: "sse",
        push: () => true,
        onClose: () => {},
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("registers SSE route with otok-realtime (auth required)", async () => {
    const channel = accessForTenant("tenant-a");
    const app = new Hono();
    configureRealtimeApp(app, { channels: { "discussions-thread": channel } });

    const unauth = await app.request(
      `/realtime/sse/discussions-thread/${encodeURIComponent(discussionThreadRoomKey(subjectA, "thread-1"))}`,
    );
    expect(unauth.status).toBe(401);
  });

  it("replays after Last-Event-ID and handles unknown event ids", async () => {
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    const broker = hub.getBroker()!;
    const channel = accessForTenant("tenant-a");
    const room = discussionThreadRoomKey(subjectA, "t1");

    const first = await hub.publish(channel, room, "discussion.comment.created", {
      v: 1,
      name: "discussion.comment.created",
      tenantId: "tenant-a",
      subjectType: "job",
      subjectId: "job-1",
      threadId: "t1",
      commentId: "c1",
      occurredAt: "2026-06-01T12:00:00.000Z",
    });
    await hub.publish(channel, room, "discussion.comment.created", {
      v: 1,
      name: "discussion.comment.created",
      tenantId: "tenant-a",
      subjectType: "job",
      subjectId: "job-1",
      threadId: "t1",
      commentId: "c2",
      occurredAt: "2026-06-01T12:01:00.000Z",
    });

    const replayExpired = broker.replaySince(channel.name, room, "unknown-event-id");
    expect(replayExpired.length).toBe(2);

    const replayed: string[] = [];
    await hub.connect({
      user: { id: "alice" },
      channel,
      room,
      transport: "sse",
      lastEventId: first.id,
      push: (msg) => {
        if ("type" in msg && msg.type === "discussion.comment.created") {
          replayed.push((msg.data as { commentId?: string }).commentId ?? "");
        }
        return true;
      },
      onClose: () => {},
    });
    expect(replayed).not.toContain("c1");
    expect(replayed).toContain("c2");
  });

  it("publishes live events from engine bridge without full bodies", async () => {
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    const channel = accessForTenant("tenant-a");

    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({ moderationMode: "post" }, deps);
    attachLiveUpdatesBridge(runtime, { hub, channel });

    const received: string[] = [];
    const engine = new DiscussionEngine(new MemoryDiscussionStore(), runtime);
    const thread = await engine.createThread({ subject: subjectA, title: "T", createdById: "u1" });
    const targetRoom = discussionThreadRoomKey(subjectA, thread.id);
    hub.getBroker()!.subscribe(channel.name, targetRoom, (msg) => {
      if (msg.type === "discussion.comment.created") {
        received.push(JSON.stringify(msg.data));
      }
    });

    await engine.createComment({
      subject: subjectA,
      threadId: thread.id,
      authorId: "u1",
      bodyMarkdown: "Hello **world**",
    });

    await vi.waitFor(() => expect(received.length).toBe(1));
    expect(received[0]).not.toContain("world");
    expect(received[0]).toContain("commentId");
  });

  it("closes connections on hub shutdown", async () => {
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    const channel = accessForTenant("tenant-a");
    await hub.connect({
      user: { id: "u1" },
      channel,
      room: discussionThreadRoomKey(subjectA, "t1"),
      transport: "sse",
      push: () => true,
      onClose: () => {},
    });
    expect(hub.connectionCount).toBe(1);
    await hub.shutdown();
    expect(hub.connectionCount).toBe(0);
  });
});
