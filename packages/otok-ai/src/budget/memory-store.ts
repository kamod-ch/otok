import type {
  AcquireReservationInput,
  AiBudgetKey,
  AiBudgetRecord,
  AiBudgetReservationStore,
  AiBudgetStore,
  AiUsage,
  ReleaseReservationInput,
  SettleReservationInput,
} from "../types.js";
import { resolveBudgetLimits } from "./limits.js";
import { microUsdToUsd, normalizeTokenCount, usageCostMicroUsd } from "./micro-usd.js";
import { isWithinPeriod, ORG_USER_SENTINEL, periodBounds } from "./period.js";

interface UsageRow {
  key: string;
  orgId: string;
  userId: string;
  tokensUsed: number;
  tokensReserved: number;
  costMicroUsdUsed: number;
  costMicroUsdReserved: number;
  periodStart: string;
  periodEnd: string;
}

type ReservationStatus = "held" | "settled" | "released" | "expired";

interface ReservationRow {
  requestId: string;
  orgId: string;
  userId: string;
  periodStart: string;
  estimatedTokens: number;
  estimatedCostMicroUsd: number;
  status: ReservationStatus;
  expiresAt: string;
}

function userRowKey(key: AiBudgetKey): string {
  return `${key.orgId ?? "_"}:${key.userId ?? "_"}`;
}

function orgRowKey(orgId: string): string {
  return `${orgId}:${ORG_USER_SENTINEL}`;
}

export function createMemoryBudgetStore(defaults?: {
  maxTokensPerUser?: number;
  maxCostUsdPerOrg?: number;
  now?: () => Date;
}): AiBudgetReservationStore {
  const usageRows = new Map<string, UsageRow>();
  const reservations = new Map<string, ReservationRow>();
  const nowFn = defaults?.now ?? (() => new Date());

  function ensureRow(id: string, orgId: string, userId: string): UsageRow {
    const existing = usageRows.get(id);
    const { start, end } = periodBounds(nowFn());
    if (existing) {
      if (!isWithinPeriod(nowFn(), existing.periodStart, existing.periodEnd)) {
        existing.tokensUsed = 0;
        existing.tokensReserved = 0;
        existing.costMicroUsdUsed = 0;
        existing.costMicroUsdReserved = 0;
        existing.periodStart = start;
        existing.periodEnd = end;
      }
      return existing;
    }
    const row: UsageRow = {
      key: id,
      orgId,
      userId,
      tokensUsed: 0,
      tokensReserved: 0,
      costMicroUsdUsed: 0,
      costMicroUsdReserved: 0,
      periodStart: start,
      periodEnd: end,
    };
    usageRows.set(id, row);
    return row;
  }

  function userRow(key: AiBudgetKey): UsageRow {
    const orgId = key.orgId ?? "_";
    const userId = key.userId ?? "_";
    return ensureRow(userRowKey(key), orgId, userId);
  }

  function orgRow(key: AiBudgetKey): UsageRow | null {
    if (!key.orgId) return null;
    return ensureRow(orgRowKey(key.orgId), key.orgId, ORG_USER_SENTINEL);
  }

  async function throwExceeded(message: string): Promise<never> {
    const { OtokAiBudgetExceededError } = await import("../errors.js");
    throw new OtokAiBudgetExceededError(message);
  }

  function assertLimits(key: AiBudgetKey, estimatedTokens: number, estimatedCostMicroUsd: number): void {
    const limits = resolveBudgetLimits(key, defaults);
    const user = userRow(key);
    const org = orgRow(key);

    if (limits.maxTokensPerRequest !== undefined) {
      const est = normalizeTokenCount(estimatedTokens);
      if (est > limits.maxTokensPerRequest) {
        throw new Error(`PER_REQUEST:${est}/${limits.maxTokensPerRequest}`);
      }
    }

    if (limits.maxTokensPerPeriod !== undefined) {
      const est = normalizeTokenCount(estimatedTokens);
      const used = user.tokensUsed + user.tokensReserved;
      if (used >= limits.maxTokensPerPeriod || used + est > limits.maxTokensPerPeriod) {
        throw new Error(`USER_TOKENS:${used}/${limits.maxTokensPerPeriod}`);
      }
    }

    if (limits.maxCostMicroUsdPerUser !== undefined) {
      const used = user.costMicroUsdUsed + user.costMicroUsdReserved;
      if (used >= limits.maxCostMicroUsdPerUser || used + estimatedCostMicroUsd > limits.maxCostMicroUsdPerUser) {
        throw new Error(`USER_COST`);
      }
    }

    if (org && limits.maxCostMicroUsdPerOrg !== undefined) {
      const used = org.costMicroUsdUsed + org.costMicroUsdReserved;
      if (used >= limits.maxCostMicroUsdPerOrg || used + estimatedCostMicroUsd > limits.maxCostMicroUsdPerOrg) {
        throw new Error(`ORG_COST`);
      }
    }
  }

  function expireStaleReservations(): void {
    const now = nowFn().toISOString();
    for (const reservation of reservations.values()) {
      if (reservation.status !== "held" || reservation.expiresAt > now) continue;
      reservation.status = "expired";
      const user = ensureRow(
        userRowKey({ orgId: reservation.orgId, userId: reservation.userId }),
        reservation.orgId,
        reservation.userId,
      );
      user.tokensReserved = Math.max(0, user.tokensReserved - reservation.estimatedTokens);
      user.costMicroUsdReserved = Math.max(0, user.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      const org =
        reservation.orgId !== "_"
          ? ensureRow(orgRowKey(reservation.orgId), reservation.orgId, ORG_USER_SENTINEL)
          : null;
      if (org) {
        org.costMicroUsdReserved = Math.max(0, org.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      }
    }
  }

  const store: AiBudgetReservationStore & { _reset?: () => void } = {
    async check(key, estimatedTokens = 0) {
      expireStaleReservations();
      try {
        assertLimits(key, estimatedTokens, 0);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("PER_REQUEST:")) {
          const [, detail] = error.message.split(":");
          await throwExceeded(`Per-request token budget exceeded: ${detail}`);
        }
        if (error instanceof Error && error.message.startsWith("USER_TOKENS:")) {
          const [, detail] = error.message.split(":");
          await throwExceeded(`Token budget exceeded for ${userRowKey(key)}: ${detail}`);
        }
        if (error instanceof Error && error.message === "USER_COST") {
          const user = userRow(key);
          await throwExceeded(
            `Cost budget exceeded for ${userRowKey(key)}: $${microUsdToUsd(user.costMicroUsdUsed).toFixed(4)}`,
          );
        }
        if (error instanceof Error && error.message === "ORG_COST") {
          await throwExceeded(`Org cost budget exceeded for ${key.orgId}`);
        }
        throw error;
      }
    },

    async record(key, usage: AiUsage) {
      expireStaleReservations();
      const tokens = normalizeTokenCount(usage.totalTokens);
      const costMicro = usageCostMicroUsd(usage);
      const user = userRow(key);
      user.tokensUsed += tokens;
      user.costMicroUsdUsed += costMicro;
      const org = orgRow(key);
      if (org) {
        org.costMicroUsdUsed += costMicro;
      }
    },

    async getUsage(key) {
      expireStaleReservations();
      const id = userRowKey(key);
      const existing = usageRows.get(id);
      if (!existing) return null;
      if (!isWithinPeriod(nowFn(), existing.periodStart, existing.periodEnd)) {
        const { start, end } = periodBounds(nowFn());
        existing.tokensUsed = 0;
        existing.tokensReserved = 0;
        existing.costMicroUsdUsed = 0;
        existing.costMicroUsdReserved = 0;
        existing.periodStart = start;
        existing.periodEnd = end;
      }
      const record: AiBudgetRecord = {
        key: existing.key,
        tokensUsed: existing.tokensUsed,
        costUsd: microUsdToUsd(existing.costMicroUsdUsed),
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
      };
      return record;
    },

    async acquireReservation(input: AcquireReservationInput) {
      expireStaleReservations();
      const { requestId, key, estimatedTokens, estimatedCostMicroUsd = 0, expiresAt } = input;
      if (!requestId) throw new RangeError("requestId is required");

      const existing = reservations.get(requestId);
      if (existing) {
        if (existing.status === "held") {
          return { requestId, status: "existing" as const };
        }
        return { requestId, status: "existing" as const };
      }

      const estTokens = normalizeTokenCount(estimatedTokens);
      const estCost = estimatedCostMicroUsd;
      if (!Number.isFinite(estCost) || estCost < 0) {
        throw new RangeError("Invalid estimatedCostMicroUsd");
      }

      try {
        assertLimits(key, estTokens, estCost);
      } catch {
        await throwExceeded(`Reservation would exceed budget for ${userRowKey(key)}`);
      }

      const orgId = key.orgId ?? "_";
      const userId = key.userId ?? "_";
      const { start } = periodBounds(nowFn());

      reservations.set(requestId, {
        requestId,
        orgId,
        userId,
        periodStart: start,
        estimatedTokens: estTokens,
        estimatedCostMicroUsd: estCost,
        status: "held",
        expiresAt,
      });

      const user = userRow(key);
      user.tokensReserved += estTokens;
      user.costMicroUsdReserved += estCost;
      const org = orgRow(key);
      if (org) {
        org.costMicroUsdReserved += estCost;
      }

      return { requestId, status: "held" as const };
    },

    async settleReservation(input: SettleReservationInput) {
      expireStaleReservations();
      const reservation = reservations.get(input.requestId);
      if (!reservation) return;
      if (reservation.status === "settled" || reservation.status === "released" || reservation.status === "expired") {
        return;
      }

      const key: AiBudgetKey = {
        orgId: reservation.orgId === "_" ? undefined : reservation.orgId,
        userId: reservation.userId === "_" ? undefined : reservation.userId,
      };
      const user = userRow(key);
      const org = orgRow(key);

      user.tokensReserved = Math.max(0, user.tokensReserved - reservation.estimatedTokens);
      user.costMicroUsdReserved = Math.max(0, user.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      if (org) {
        org.costMicroUsdReserved = Math.max(0, org.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      }

      if (input.unknownUsage) {
        reservation.status = "settled";
        return;
      }

      if (input.usage) {
        const tokens = normalizeTokenCount(input.usage.totalTokens);
        const costMicro = usageCostMicroUsd(input.usage);
        user.tokensUsed += tokens;
        user.costMicroUsdUsed += costMicro;
        if (org) {
          org.costMicroUsdUsed += costMicro;
        }
      }

      reservation.status = "settled";
    },

    async releaseReservation(input: ReleaseReservationInput) {
      expireStaleReservations();
      const reservation = reservations.get(input.requestId);
      if (!reservation || reservation.status !== "held") return;

      const key: AiBudgetKey = {
        orgId: reservation.orgId === "_" ? undefined : reservation.orgId,
        userId: reservation.userId === "_" ? undefined : reservation.userId,
      };
      const user = userRow(key);
      const org = orgRow(key);

      user.tokensReserved = Math.max(0, user.tokensReserved - reservation.estimatedTokens);
      user.costMicroUsdReserved = Math.max(0, user.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      if (org) {
        org.costMicroUsdReserved = Math.max(0, org.costMicroUsdReserved - reservation.estimatedCostMicroUsd);
      }
      reservation.status = "released";
    },

    _reset() {
      usageRows.clear();
      reservations.clear();
    },
  };

  return store;
}

/** @internal */
export function resetMemoryBudgetStore(store: AiBudgetStore & { _reset?: () => void }): void {
  store._reset?.();
}

export function createMemoryBudgetStoreWithReset(
  defaults?: Parameters<typeof createMemoryBudgetStore>[0],
): AiBudgetReservationStore & { _reset: () => void } {
  const store = createMemoryBudgetStore(defaults);
  return store as AiBudgetReservationStore & { _reset: () => void };
}
