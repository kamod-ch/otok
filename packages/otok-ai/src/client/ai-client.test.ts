import { describe, expect, it, vi } from "vitest";
import { AiClient } from "../client/ai-client.js";
import { createMemoryBudgetStore } from "../budget/memory-store.js";
import { configureTestProvider, createTestProvider, resetTestProvider } from "../providers/test.js";
import { collectStreamEvents } from "../stream/sse.js";
import { OtokAiAbortedError, OtokAiBudgetExceededError, OtokAiTimeoutError } from "../errors.js";
import { defineAiTool } from "../tools/define-tool.js";
import type { AiProvider, AiProviderCapabilities } from "../types.js";
import { z } from "zod";

const stubCapabilities: AiProviderCapabilities = {
  streaming: true,
  tools: true,
  structuredOutput: true,
  embeddings: true,
};

function createBlockingStreamProvider() {
  let unblock: (() => void) | null = null;
  let finallyRuns = 0;
  const provider: AiProvider = {
    id: "blocking",
    capabilities: stubCapabilities,
    async *stream(options) {
      try {
        yield { type: "text-delta", delta: "first" };
        await new Promise<void>((resolve) => {
          const signal = options.signal;
          const finish = () => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          };
          const onAbort = () => finish();
          if (signal?.aborted) {
            finish();
            return;
          }
          signal?.addEventListener("abort", onAbort, { once: true });
          unblock = finish;
        });
        if (options.signal?.aborted) return;
        yield { type: "text-delta", delta: "second" };
        yield { type: "done", finishReason: "stop" };
      } finally {
        finallyRuns += 1;
      }
    },
    async complete() {
      return { text: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: "stop" };
    },
    async embed(options) {
      const input = Array.isArray(options.input) ? options.input : [options.input];
      return {
        embeddings: input.map(() => [0]),
        model: "blocking",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    },
  };
  return {
    provider,
    unblock: () => unblock?.(),
    getFinallyRuns: () => finallyRuns,
  };
}

function createIgnoringSignalProvider() {
  let finallyRuns = 0;
  const provider: AiProvider = {
    id: "ignore-signal",
    capabilities: stubCapabilities,
    async *stream() {
      try {
        yield { type: "text-delta", delta: "only" };
        await new Promise<void>(() => {
          /* never resolves — client must not hang forever */
        });
      } finally {
        finallyRuns += 1;
      }
    },
    async complete() {
      return { text: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: "stop" };
    },
    async embed(options) {
      const input = Array.isArray(options.input) ? options.input : [options.input];
      return {
        embeddings: input.map(() => [0]),
        model: "ignore",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    },
  };
  return { provider, getFinallyRuns: () => finallyRuns };
}

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

describe("AI stream lifetime", () => {
  it("times out while blocked on iterator next(), not only iterator creation", async () => {
    const { provider } = createBlockingStreamProvider();
    const client = new AiClient({
      provider,
      defaultModel: "blocking",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 50,
      retries: 0,
    });

    const result = client.stream({ messages: [{ role: "user", content: "hi" }] });
    const eventsPromise = collectStreamEvents(result.events);

    await expect(eventsPromise).rejects.toBeInstanceOf(OtokAiTimeoutError);
    await expect(result.usage).rejects.toBeInstanceOf(OtokAiTimeoutError);
    await drainSseResponse(result.response);
  });

  it("distinguishes explicit client abort from operation timeout", async () => {
    const { provider } = createBlockingStreamProvider();
    const client = new AiClient({
      provider,
      defaultModel: "blocking",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 60_000,
      retries: 0,
    });

    const result = client.stream({ messages: [{ role: "user", content: "hi" }] });
    const eventsPromise = collectStreamEvents(result.events);

    await Promise.resolve();
    result.abort();

    await expect(eventsPromise).rejects.toBeInstanceOf(OtokAiAbortedError);
    await expect(result.usage).rejects.toBeInstanceOf(OtokAiAbortedError);
    await drainSseResponse(result.response);
  });

  it("runs provider cleanup when operation ends after timeout", async () => {
    const { provider, getFinallyRuns } = createBlockingStreamProvider();
    const client = new AiClient({
      provider,
      defaultModel: "blocking",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 50,
      retries: 0,
    });

    const result = client.stream({ messages: [{ role: "user", content: "hi" }] });
    const eventsPromise = collectStreamEvents(result.events);
    await expect(eventsPromise).rejects.toBeInstanceOf(OtokAiTimeoutError);

    expect(getFinallyRuns()).toBe(1);
    await drainSseResponse(result.response);
    await result.usage.catch(() => undefined);
  });

  it("does not hang when the provider ignores abort signals", async () => {
    const { provider } = createIgnoringSignalProvider();
    const client = new AiClient({
      provider,
      defaultModel: "ignore",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 50,
      retries: 0,
    });

    const result = client.stream({ messages: [{ role: "user", content: "hi" }] });
    const eventsPromise = collectStreamEvents(result.events);

    await expect(eventsPromise).rejects.toBeInstanceOf(OtokAiTimeoutError);
    await drainSseResponse(result.response);
    await result.usage.catch(() => undefined);
  });
});

async function drainSseResponse(response: Response): Promise<void> {
  try {
    await response.text();
  } catch {
    // stream may end with error event only
  }
}

describe("AI agent policy", () => {
  it("does not call the provider when budget check fails", async () => {
    configureTestProvider({ defaultResponse: "ok" });
    const budgetStore = createMemoryBudgetStore({ maxTokensPerUser: 20 });
    await budgetStore.record({ userId: "u1" }, { promptTokens: 10, completionTokens: 10, totalTokens: 20 });
    const provider = createTestProvider();
    const streamSpy = vi.spyOn(provider, "stream");
    const client = new AiClient({
      provider,
      defaultModel: "test",
      budgetStore,
    });

    await expect(
      client.agent({
        messages: [{ role: "user", content: "hi" }],
        budget: { userId: "u1", maxTokensPerPeriod: 20 },
      }),
    ).rejects.toBeInstanceOf(OtokAiBudgetExceededError);
    expect(streamSpy).not.toHaveBeenCalled();
    resetTestProvider();
  });

  it("records usage per agent round without a final duplicate record", async () => {
    configureTestProvider({ defaultResponse: "done" });
    const budgetStore = createMemoryBudgetStore({ maxTokensPerUser: 10_000 });
    const settleSpy = vi.spyOn(budgetStore, "settleReservation");
    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore,
    });

    await client.agent({
      messages: [{ role: "user", content: "hi" }],
      budget: { userId: "u1", maxTokensPerPeriod: 10_000 },
    });

    expect(settleSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(settleSpy.mock.calls.length).toBeLessThanOrEqual(2);
    resetTestProvider();
  });

  it("stops before round two when budget is exhausted after round one", async () => {
    configureTestProvider({
      toolCalls: [{ id: "call_1", name: "echo", arguments: { text: "x" } }],
    });
    const echo = defineAiTool({
      name: "echo",
      description: "echo",
      parameters: z.object({ text: z.string() }),
      execute: async (input: { text: string }) => ({ echoed: input.text }),
    });
    const budgetStore = createMemoryBudgetStore({ maxTokensPerUser: 20 });
    const provider = createTestProvider();
    const streamSpy = vi.spyOn(provider, "stream");
    const client = new AiClient({
      provider,
      defaultModel: "test",
      budgetStore,
    });

    await expect(
      client.agent({
        messages: [{ role: "user", content: "go" }],
        tools: { echo },
        maxSteps: 5,
        budget: { userId: "u1", maxTokensPerPeriod: 15 },
      }),
    ).rejects.toBeInstanceOf(OtokAiBudgetExceededError);

    expect(streamSpy).toHaveBeenCalledTimes(1);
    resetTestProvider();
  });

  it("redacts tool output sent back to the provider but keeps toolCallId", async () => {
    const secret = "sk-abcdefghijklmnopqrstuvwxyz1234567890";
    configureTestProvider({
      toolCalls: [{ id: "call_secret", name: "leak", arguments: { value: secret } }],
    });
    const leak = defineAiTool({
      name: "leak",
      description: "leak",
      parameters: z.object({ value: z.string() }),
      execute: async (input: { value: string }) => ({ token: input.value }),
    });
    const provider = createTestProvider();
    const underlying = createTestProvider();
    let capturedMessages: unknown;
    vi.spyOn(provider, "stream").mockImplementation(async function* (options) {
      if (options.messages.some((m) => m.role === "tool")) {
        capturedMessages = options.messages;
      }
      yield* underlying.stream(options);
    });

    const client = new AiClient({
      provider,
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
      redact: true,
    });

    await client.agent({
      messages: [{ role: "user", content: "run" }],
      tools: { leak },
      maxSteps: 3,
    });

    const toolMsg = (capturedMessages as { role: string; toolCallId?: string; content: string }[]).find(
      (m) => m.role === "tool",
    );
    expect(toolMsg?.toolCallId).toBe("call_secret");
    expect(toolMsg?.content).not.toContain("sk-abc");
    resetTestProvider();
  });

  it("invokes onUsage and onAudit for agent with aggregated usage", async () => {
    configureTestProvider({ defaultResponse: "hello" });
    const onUsage = vi.fn();
    const onAudit = vi.fn();
    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
      onUsage,
      onAudit,
    });

    await client.agent({
      messages: [{ role: "user", content: "hi" }],
      budget: { userId: "u1", orgId: "org1" },
    });

    expect(onUsage).toHaveBeenCalledTimes(1);
    expect(onAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ai.agent",
        userId: "u1",
        orgId: "org1",
        model: "test",
        usage: expect.objectContaining({ totalTokens: expect.any(Number) }),
      }),
    );
    resetTestProvider();
  });

  it("does not call provider when signal is already aborted", async () => {
    configureTestProvider({ defaultResponse: "nope" });
    const provider = createTestProvider();
    const streamSpy = vi.spyOn(provider, "stream");
    const client = new AiClient({
      provider,
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      client.agent({
        messages: [{ role: "user", content: "hi" }],
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(OtokAiAbortedError);
    expect(streamSpy).not.toHaveBeenCalled();
    resetTestProvider();
  });

  it("times out agent provider round without retrying tools", async () => {
    const echo = defineAiTool({
      name: "echo",
      description: "echo",
      parameters: z.object({ text: z.string() }),
      execute: async (input: { text: string }) => ({ echoed: input.text }),
    });
    const executeSpy = vi.spyOn(echo, "execute");
    configureTestProvider({
      toolCalls: [{ id: "c1", name: "echo", arguments: { text: "a" } }],
      delayMs: 300,
    });

    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 50,
      retries: 0,
    });

    await expect(
      client.agent({
        messages: [{ role: "user", content: "go" }],
        tools: { echo },
        maxSteps: 2,
      }),
    ).rejects.toBeInstanceOf(OtokAiTimeoutError);
    expect(executeSpy).not.toHaveBeenCalled();
    resetTestProvider();
  });
});
