import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiClient } from "../client/ai-client.js";
import { createMemoryBudgetStore } from "../budget/memory-store.js";
import { configureTestProvider, resetTestProvider, createTestProvider } from "../providers/test.js";
import { defineAiTool } from "../tools/define-tool.js";
import { OtokAiAbortedError, OtokAiBudgetExceededError } from "../errors.js";

const findCompany = defineAiTool<{ name: string }, { id: string; name: string }>({
  name: "findCompany",
  description: "Find a company by name",
  parameters: z.object({ name: z.string() }),
  execute: async (input) => ({ id: "co_1", name: input.name }),
});

describe("AI tool calls", () => {
  it("executes tools in agent loop", async () => {
    configureTestProvider({
      toolCalls: [{ id: "call_1", name: "findCompany", arguments: { name: "Acme" } }],
    });
    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
    });

    const result = await client.agent({
      messages: [{ role: "user", content: "find Acme" }],
      tools: { findCompany },
      maxSteps: 3,
    });

    expect(result.steps).toBeGreaterThan(0);
    resetTestProvider();
  });
});

describe("AI budgets", () => {
  it("throws when token budget exceeded", async () => {
    const store = createMemoryBudgetStore({ maxTokensPerUser: 5 });
    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore: store,
    });

    await store.record({ userId: "u1" }, { promptTokens: 4, completionTokens: 1, totalTokens: 5 });

    await expect(
      client.stream({
        messages: [{ role: "user", content: "hello" }],
        budget: { userId: "u1", maxTokens: 5 },
      }).usage,
    ).rejects.toBeInstanceOf(OtokAiBudgetExceededError);
  });
});

describe("AI abort", () => {
  it("aborts streaming via abort()", async () => {
    configureTestProvider({ defaultResponse: "slow", delayMs: 500 });
    const client = new AiClient({
      provider: createTestProvider(),
      defaultModel: "test",
      budgetStore: createMemoryBudgetStore(),
      timeoutMs: 30_000,
    });

    const result = client.stream({ messages: [{ role: "user", content: "wait" }] });
    result.abort();

    await expect(result.usage).rejects.toBeInstanceOf(OtokAiAbortedError);
    await expect(async () => {
      for await (const _ of result.events) {
        // consume
      }
    }).rejects.toBeInstanceOf(OtokAiAbortedError);
    resetTestProvider();
  });
});

describe("AI provider errors", () => {
  it("retries then throws on persistent provider failure", async () => {
    const failingProvider = {
      id: "fail",
      capabilities: { streaming: true, tools: false, structuredOutput: false, embeddings: false },
      async *stream() {
        throw new (await import("../errors.js")).OtokAiProviderError("fail", "500 error", 500);
      },
      async complete() {
        throw new (await import("../errors.js")).OtokAiProviderError("fail", "500 error", 500);
      },
      async embed() {
        throw new (await import("../errors.js")).OtokAiProviderError("fail", "embed fail", 500);
      },
    };

    const client = new AiClient({
      provider: failingProvider,
      defaultModel: "fail",
      budgetStore: createMemoryBudgetStore(),
      retries: 1,
    });

    await expect(
      client.structured({
        messages: [{ role: "user", content: "x" }],
        schema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
});
