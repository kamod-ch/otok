import { describe, expect, it } from "vitest";
import { createMemoryBudgetStore, createMemoryBudgetStoreWithReset, resetMemoryBudgetStore } from "./memory-store.js";
import { periodBounds } from "./period.js";
import { usdToMicroUsd } from "./micro-usd.js";

describe("memory budget store", () => {
  it("rolls period counters when month changes", async () => {
    const jan = new Date("2026-01-15T12:00:00.000Z");
    const feb = new Date("2026-02-02T00:00:00.000Z");
    let now = jan;
    const store = createMemoryBudgetStore({ now: () => now });
    await store.record({ userId: "u1" }, { promptTokens: 50, completionTokens: 0, totalTokens: 50 });
    now = feb;
    const usage = await store.getUsage({ userId: "u1" });
    expect(usage?.tokensUsed).toBe(0);
    await store.record({ userId: "u1" }, { promptTokens: 2, completionTokens: 0, totalTokens: 2 });
    const after = await store.getUsage({ userId: "u1" });
    expect(after?.tokensUsed).toBe(2);
  });

  it("enforces org cost cap across two users", async () => {
    const store = createMemoryBudgetStore({
      maxCostUsdPerOrg: 0.00001,
    });
    const micro = usdToMicroUsd(0.00001);
    await store.acquireReservation({
      requestId: "r1",
      key: { orgId: "org1", userId: "u1", maxCostMicroUsdPerOrg: micro },
      estimatedTokens: 1,
      estimatedCostMicroUsd: micro,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await store.settleReservation({
      requestId: "r1",
      usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1, estimatedCostUsd: 0.00001 },
    });

    await expect(
      store.acquireReservation({
        requestId: "r2",
        key: { orgId: "org1", userId: "u2", maxCostMicroUsdPerOrg: micro },
        estimatedTokens: 1,
        estimatedCostMicroUsd: 1,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).rejects.toThrow(/budget/i);
  });

  it("resets via createMemoryBudgetStoreWithReset", async () => {
    const store = createMemoryBudgetStoreWithReset();
    await store.record({ userId: "u1" }, { promptTokens: 3, completionTokens: 0, totalTokens: 3 });
    resetMemoryBudgetStore(store);
    const usage = await store.getUsage({ userId: "u1" });
    expect(usage?.tokensUsed ?? 0).toBe(0);
  });

  it("treats maxTokens as per-request ceiling", async () => {
    const store = createMemoryBudgetStore();
    await expect(store.check({ userId: "u1", maxTokens: 10 }, 11)).rejects.toThrow(/budget/i);
    await expect(store.check({ userId: "u1", maxTokens: 10 }, 5)).resolves.toBeUndefined();
  });

  it("uses maxTokensPerPeriod for monthly totals", async () => {
    const store = createMemoryBudgetStore({ maxTokensPerUser: 100 });
    await store.record({ userId: "u1" }, { promptTokens: 100, completionTokens: 0, totalTokens: 100 });
    await expect(store.check({ userId: "u1", maxTokensPerPeriod: 100 })).rejects.toThrow(/budget/i);
  });
});

describe("memory period bounds", () => {
  it("uses UTC month boundaries", () => {
    const { start, end } = periodBounds(new Date("2026-03-20T00:00:00.000Z"));
    expect(start).toBe("2026-03-01T00:00:00.000Z");
    expect(end).toBe("2026-04-01T00:00:00.000Z");
  });
});
