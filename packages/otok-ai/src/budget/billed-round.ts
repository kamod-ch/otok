import { randomUUID } from "node:crypto";
import type { AiBudgetKey, AiBudgetStore, AiUsage } from "../types.js";
import { isAiBudgetReservationStore } from "./guards.js";

const DEFAULT_ROUND_ESTIMATE_TOKENS = 4096;
const RESERVATION_TTL_MS = 15 * 60_000;

export interface BilledRoundHandle {
  requestId?: string;
  finalize: (usage?: AiUsage, options?: { unknownUsage?: boolean }) => Promise<void>;
}

export async function beginBilledRound(
  store: AiBudgetStore,
  budget?: AiBudgetKey,
  estimatedTokens?: number,
): Promise<BilledRoundHandle> {
  if (!budget) {
    return { finalize: async () => undefined };
  }

  if (!isAiBudgetReservationStore(store)) {
    await store.check(budget, estimatedTokens);
    return {
      finalize: async (usage) => {
        if (!usage) return;
        if (usage.totalTokens <= 0 && (usage.estimatedCostUsd ?? 0) <= 0) return;
        await store.record(budget, usage);
      },
    };
  }

  const requestId = randomUUID();
  const estimate = estimatedTokens ?? budget.maxTokens ?? budget.maxTokensPerPeriod ?? DEFAULT_ROUND_ESTIMATE_TOKENS;
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();

  await store.acquireReservation({
    requestId,
    key: budget,
    estimatedTokens: estimate,
    estimatedCostMicroUsd: 0,
    expiresAt,
  });

  return {
    requestId,
    finalize: async (usage, options) => {
      if (options?.unknownUsage || !usage) {
        await store.settleReservation({ requestId, usage: null, unknownUsage: true });
        return;
      }
      if (usage.totalTokens <= 0 && (usage.estimatedCostUsd ?? 0) <= 0) {
        await store.releaseReservation({ requestId });
        return;
      }
      await store.settleReservation({ requestId, usage });
    },
  };
}
