import { describe, expect, it } from "vitest";
import type { AiBudgetKey, AiBudgetStore, AiBudgetReservationStore } from "../types.js";
import { AiClient, type AiClientOptions } from "../client/ai-client.js";
import { createMemoryBudgetStore } from "./memory-store.js";
import { isAiBudgetReservationStore } from "./guards.js";
import type { AiBudgetDatabase, KyselyAiBudgetStoreOptions } from "./kysely/index.js";

describe("budget consumer fixtures", () => {
  it("accepts legacy AiBudgetStore implementations", async () => {
    const legacy: AiBudgetStore = {
      check: async () => undefined,
      record: async () => undefined,
      getUsage: async () => null,
    };
    const client = new AiClient({
      provider: {
        id: "x",
        capabilities: { streaming: false, tools: false, structuredOutput: false, embeddings: false },
        stream: async function* () {},
        complete: async () => ({
          text: "",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "stop",
        }),
        embed: async () => ({
          embeddings: [],
          model: "m",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      },
      defaultModel: "m",
      budgetStore: legacy,
    });
    expect(client).toBeInstanceOf(AiClient);
  });

  it("detects reservation capability on memory store", () => {
    const store = createMemoryBudgetStore();
    expect(isAiBudgetReservationStore(store)).toBe(true);
    const narrowed: AiBudgetReservationStore = store;
    expect(typeof narrowed.acquireReservation).toBe("function");
  });

  it("types optional kysely exports without runtime import", () => {
    const _opts: KyselyAiBudgetStoreOptions = { dialect: "postgres" };
    const _db: AiBudgetDatabase = {} as AiBudgetDatabase;
    const key: AiBudgetKey = { userId: "u", maxTokensPerPeriod: 1 };
    const _clientOpts: AiClientOptions = {
      provider: {
        id: "p",
        capabilities: { streaming: true, tools: false, structuredOutput: false, embeddings: false },
        stream: async function* () {},
        complete: async () => ({
          text: "",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "stop",
        }),
        embed: async () => ({
          embeddings: [],
          model: "m",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      },
      defaultModel: "m",
      budgetStore: createMemoryBudgetStore(),
    };
    expect(key.userId).toBe("u");
    expect(_opts.dialect).toBe("postgres");
    expect(_db).toBeDefined();
  });
});
