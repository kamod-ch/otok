import { describe, expect, it } from "vitest";
import { AiClient } from "../client/ai-client.js";
import { createMemoryBudgetStore } from "../budget/memory-store.js";
import { configureTestProvider, resetTestProvider } from "../providers/test.js";
import { collectStreamEvents } from "../stream/sse.js";

describe("AI streaming", () => {
  it("streams text deltas from test provider", async () => {
    configureTestProvider({ defaultResponse: "Hello streaming world" });
    const client = new AiClient({
      provider: (await import("../providers/test.js")).createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
    });

    const { events } = client.stream({
      messages: [{ role: "user", content: "hi" }],
    });

    const collected = await collectStreamEvents(events);
    expect(collected.text).toBe("Hello streaming world");
    expect(collected.events.some((e) => e.type === "text-delta")).toBe(true);
    expect(collected.events.some((e) => e.type === "done")).toBe(true);
    resetTestProvider();
  });

  it("returns SSE Response from stream()", async () => {
    configureTestProvider({ defaultResponse: "SSE" });
    const client = new AiClient({
      provider: (await import("../providers/test.js")).createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
    });
    const result = client.stream({ messages: [{ role: "user", content: "x" }] });
    expect(result.response.headers.get("content-type")).toContain("text/event-stream");
    resetTestProvider();
  });
});
