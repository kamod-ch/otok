import { describe, expect, it } from "vitest";
import { RealtimeHub } from "./hub.js";
import { createSharedBrokerProviders } from "./providers/memory.js";
import { defineChannel } from "./define-channel.js";

const channel = defineChannel({
  name: "companies",
  authorize: ({ user }) => Boolean(user),
});

describe("multi-instance", () => {
  it("delivers events across provider instances via shared broker", async () => {
    const [providerA, providerB] = createSharedBrokerProviders(2);
    const hubA = new RealtimeHub({ provider: providerA });
    const hubB = new RealtimeHub({ provider: providerB });

    const received: string[] = [];

    await hubB.connect({
      user: { id: "viewer" },
      channel,
      room: "acme",
      transport: "websocket",
      push: (msg) => {
        if ("type" in msg && msg.type === "activity") received.push(String(msg.data));
        return true;
      },
      onClose: () => {},
    });

    await hubA.publish(channel, "acme", "activity", "from-instance-a");
    expect(received).toContain("from-instance-a");
  });
});
