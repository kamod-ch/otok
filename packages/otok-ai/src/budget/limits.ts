import type { AiBudgetKey } from "../types.js";
import { usdToMicroUsd } from "./micro-usd.js";

export interface ResolvedBudgetLimits {
  maxTokensPerRequest?: number;
  maxTokensPerPeriod?: number;
  maxCostMicroUsdPerUser?: number;
  maxCostMicroUsdPerOrg?: number;
}

export function resolveBudgetLimits(
  key: AiBudgetKey,
  defaults?: { maxTokensPerUser?: number; maxCostUsdPerOrg?: number },
): ResolvedBudgetLimits {
  const maxTokensPerPeriod = key.maxTokensPerPeriod ?? defaults?.maxTokensPerUser ?? undefined;
  const maxCostMicroUsdPerUser =
    key.maxCostMicroUsdPerUser ?? (key.maxCostUsd !== undefined ? usdToMicroUsd(key.maxCostUsd) : undefined);
  const maxCostMicroUsdPerOrg =
    key.maxCostMicroUsdPerOrg ??
    (defaults?.maxCostUsdPerOrg !== undefined ? usdToMicroUsd(defaults.maxCostUsdPerOrg) : undefined);

  return {
    maxTokensPerRequest: key.maxTokens,
    maxTokensPerPeriod,
    maxCostMicroUsdPerUser,
    maxCostMicroUsdPerOrg,
  };
}
