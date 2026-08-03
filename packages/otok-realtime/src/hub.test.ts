import { describe, expect, it } from "vitest";
import { defineChannel, z } from "./define-channel.js";
import { RealtimeHub } from "./hub.js";
import { createMemoryProvider } from "./providers/memory.js";
import { RealtimeException } from "./errors.js";

const testChannel = defineChannel({
  name: "companies",
  schema: z.object({ note: z.string() }),
  authorize: ({ user }) => Boolean(user),
});

describe("RealtimeHub", () => {
  it("delivers published events to connected clients", async () => {
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    const received: string[] = [];

    await hub.connect({
      user: { id: "u1" },
      channel: testChannel,
      room: "acme",
      transport: "sse",
      push: (msg) => {
        if ("type" in msg && msg.type === "activity") {
          received.push((msg.data as { note: string }).note);
        }
        return true;
      },
      onClose: () => {},
    });

    await hub.publish(testChannel, "acme", "activity", { note: "Called client" });
    expect(received).toContain("Called client");
  });

  it("replays missed events after reconnect with lastEventId", async () => {
    const provider = createMemoryProvider();
    const hub = new RealtimeHub({ provider });

    await hub.publish(testChannel, "acme", "activity", { note: "first" });
    const second = await hub.publish(testChannel, "acme", "activity", { note: "second" });

    const replayed: string[] = [];
    await hub.connect({
      user: { id: "u1" },
      channel: testChannel,
      room: "acme",
      transport: "sse",
      lastEventId: second.id,
      push: (msg) => {
        if ("type" in msg && msg.type === "activity") {
          replayed.push((msg.data as { note: string }).note);
        }
        return true;
      },
      onClose: () => {},
    });

    expect(replayed).not.toContain("first");
    expect(replayed).not.toContain("second");
    await hub.publish(testChannel, "acme", "activity", { note: "third" });
    expect(replayed).toContain("third");
  });

  it("denies unauthorized users", async () => {
    const privateChannel = defineChannel({
      name: "admin",
      authorize: () => false,
    });
    const hub = new RealtimeHub({ provider: createMemoryProvider() });

    await expect(
      hub.connect({
        user: { id: "u1" },
        channel: privateChannel,
        room: "x",
        transport: "sse",
        push: () => true,
        onClose: () => {},
      }),
    ).rejects.toBeInstanceOf(RealtimeException);
  });

  it("gracefully disconnects on shutdown", async () => {
    const hub = new RealtimeHub({ provider: createMemoryProvider() });
    await hub.connect({
      user: { id: "u1" },
      channel: testChannel,
      room: "acme",
      transport: "sse",
      push: () => true,
      onClose: () => {},
    });
    expect(hub.connectionCount).toBe(1);
    await hub.shutdown();
    expect(hub.connectionCount).toBe(0);
  });
});
