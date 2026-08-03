import { describe, expect, it } from "vitest";
import { defineEvent, z } from "../define-event.js";
import { createTestEventBus } from "../testing/test-bus.js";
import { getEventContext } from "../context.js";

const testEvent = defineEvent({
  name: "order.placed",
  version: 1,
  schema: z.object({ orderId: z.string() }),
});

describe("InProcessEventBus", () => {
  it("runs sync handlers in priority order", async () => {
    const testBus = createTestEventBus();
    const order: number[] = [];

    testBus.bus.subscribe(testEvent, () => { order.push(2); }, { priority: 200 });
    testBus.bus.subscribe(testEvent, () => { order.push(1); }, { priority: 100 });

    await testBus.publish(testEvent, { orderId: "o1" });
    expect(order).toEqual([1, 2]);
  });

  it("propagates correlation and causation ids", async () => {
    const testBus = createTestEventBus();
    let childCorrelation: string | undefined;

    testBus.bus.subscribe(testEvent, (event) => {
      childCorrelation = getEventContext()?.correlationId;
      expect(getEventContext()?.causationId).toBe(event.id);
    });

    const parent = await testBus.publish(testEvent, { orderId: "o1" }, { correlationId: "corr-1" });
    expect(parent.metadata.correlationId).toBe("corr-1");
    expect(childCorrelation).toBe("corr-1");
  });

  it("marks idempotent consumers as processed", async () => {
    const testBus = createTestEventBus();
    let count = 0;

    testBus.bus.subscribe(
      testEvent,
      () => { count++; },
      { consumerName: "billing", mode: "sync" },
    );

    await testBus.publish(testEvent, { orderId: "o1" }, { idempotencyKey: "key-1" });
    expect(count).toBe(1);
    expect(await testBus.idempotency.hasProcessed("billing", "key-1")).toBe(true);
  });

  it("rejects duplicate publish idempotency keys", async () => {
    const testBus = createTestEventBus();
    await testBus.publish(testEvent, { orderId: "o1" }, { idempotencyKey: "dup" });
    await expect(testBus.publish(testEvent, { orderId: "o2" }, { idempotencyKey: "dup" })).rejects.toThrow(
      /duplicate publish idempotency/,
    );
  });

  it("routes failed async handlers to dead letter", async () => {
    const testBus = createTestEventBus();

    testBus.bus.subscribe(
      testEvent,
      () => { throw new Error("boom"); },
      { mode: "async", retry: { maxAttempts: 1 } },
    );

    await testBus.publish(testEvent, { orderId: "o1" });
    await new Promise((r) => setTimeout(r, 50));
    expect(testBus.deadLetter.records).toHaveLength(1);
    expect(testBus.deadLetter.records[0]?.error).toBe("boom");
  });
});
