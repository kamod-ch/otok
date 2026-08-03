import { describe, expect, it } from "vitest";
import { defineEvent, eventKey, z } from "./define-event.js";

describe("defineEvent", () => {
  it("creates versioned event definitions", () => {
    const evt = defineEvent<{ id: string }>({ name: "test.event", version: 2 });
    expect(eventKey(evt)).toBe("test.event@v2");
    expect(evt.__kind).toBe("otok-event");
  });

  it("validates payload on publish via schema", async () => {
    const evt = defineEvent({
      name: "user.created",
      version: 1,
      schema: z.object({ userId: z.string() }),
    });
    const { createTestEventBus } = await import("./testing/test-bus.js");
    const testBus = createTestEventBus();
    await expect(testBus.publish(evt, { userId: "u1" })).resolves.toBeDefined();
    await expect(testBus.publish(evt, { userId: 123 } as never)).rejects.toThrow(/invalid payload/);
  });
});
