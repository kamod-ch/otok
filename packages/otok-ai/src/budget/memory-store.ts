import type { AiBudgetKey, AiBudgetRecord, AiBudgetStore, AiUsage } from "../types.js";

function budgetKeyString(key: AiBudgetKey): string {
  const parts = [key.orgId ?? "_", key.userId ?? "_"].join(":");
  return parts;
}

function periodBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function createMemoryBudgetStore(defaults?: {
  maxTokensPerUser?: number;
  maxCostUsdPerOrg?: number;
}): AiBudgetStore {
  const records = new Map<string, AiBudgetRecord>();

  function getOrCreate(key: AiBudgetKey): AiBudgetRecord {
    const id = budgetKeyString(key);
    const existing = records.get(id);
    if (existing) return existing;
    const { start, end } = periodBounds();
    const record: AiBudgetRecord = {
      key: id,
      tokensUsed: 0,
      costUsd: 0,
      periodStart: start,
      periodEnd: end,
    };
    records.set(id, record);
    return record;
  }

  return {
    async check(key, estimatedTokens = 0) {
      const record = getOrCreate(key);
      const maxTokens = key.maxTokens ?? defaults?.maxTokensPerUser;
      if (maxTokens !== undefined && (record.tokensUsed >= maxTokens || record.tokensUsed + estimatedTokens > maxTokens)) {
        const { OtokAiBudgetExceededError } = await import("../errors.js");
        throw new OtokAiBudgetExceededError(
          `Token budget exceeded for ${record.key}: ${record.tokensUsed}/${maxTokens}`,
        );
      }
      const maxCost = key.maxCostUsd ?? defaults?.maxCostUsdPerOrg;
      if (maxCost !== undefined && record.costUsd >= maxCost) {
        const { OtokAiBudgetExceededError } = await import("../errors.js");
        throw new OtokAiBudgetExceededError(`Cost budget exceeded for ${record.key}: $${record.costUsd.toFixed(4)}`);
      }
    },
    async record(key, usage: AiUsage) {
      const record = getOrCreate(key);
      record.tokensUsed += usage.totalTokens;
      record.costUsd += usage.estimatedCostUsd ?? 0;
    },
    async getUsage(key) {
      return records.get(budgetKeyString(key)) ?? null;
    },
  };
}

/** @internal */
export function resetMemoryBudgetStore(store: AiBudgetStore & { _reset?: () => void }): void {
  store._reset?.();
}

export function createMemoryBudgetStoreWithReset(
  defaults?: Parameters<typeof createMemoryBudgetStore>[0],
): AiBudgetStore & { _reset: () => void } {
  const records = new Map<string, AiBudgetRecord>();
  const inner = createMemoryBudgetStore(defaults);
  return {
    ...inner,
    async check(key, estimated) {
      return inner.check(key, estimated);
    },
    async record(key, usage) {
      return inner.record(key, usage);
    },
    async getUsage(key) {
      return inner.getUsage(key);
    },
    _reset() {
      records.clear();
    },
  };
}
