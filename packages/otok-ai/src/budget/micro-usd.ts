import type { AiUsage } from "../types.js";

export const MICRO_USD_PER_USD = 1_000_000;

export function usdToMicroUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new RangeError("Invalid USD amount for budget conversion");
  }
  return Math.round(usd * MICRO_USD_PER_USD);
}

export function microUsdToUsd(micro: number): number {
  return micro / MICRO_USD_PER_USD;
}

export function usageCostMicroUsd(usage: AiUsage): number {
  if (usage.estimatedCostUsd === undefined) return 0;
  return usdToMicroUsd(usage.estimatedCostUsd);
}

export function normalizeTokenCount(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens < 0 || !Number.isInteger(tokens)) {
    throw new RangeError("Invalid token count for budget");
  }
  return tokens;
}
