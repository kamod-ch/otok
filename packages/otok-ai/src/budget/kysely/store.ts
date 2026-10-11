import type { Kysely, Transaction } from "kysely";
import type {
  AcquireReservationInput,
  AiBudgetKey,
  AiBudgetRecord,
  AiBudgetReservationStore,
  AiUsage,
  ReleaseReservationInput,
  SettleReservationInput,
} from "../../types.js";
import { resolveBudgetLimits } from "../limits.js";
import { microUsdToUsd, normalizeTokenCount, usageCostMicroUsd } from "../micro-usd.js";
import { isWithinPeriod, ORG_USER_SENTINEL, periodBounds } from "../period.js";
import { type AiBudgetDatabase, type AiBudgetDialect, RESERVATIONS_TABLE, USAGE_TABLE } from "./schema.js";

export type { AiBudgetDatabase, AiBudgetDialect } from "./schema.js";

type Db = Kysely<AiBudgetDatabase>;

export interface KyselyAiBudgetStoreOptions {
  dialect: AiBudgetDialect;
  defaults?: { maxTokensPerUser?: number; maxCostUsdPerOrg?: number };
  now?: () => Date;
}

interface UsageSnapshot {
  tokensUsed: number;
  tokensReserved: number;
  costMicroUsdUsed: number;
  costMicroUsdReserved: number;
  periodStart: string;
  periodEnd: string;
}

function microFromDb(value: string | number): number {
  return Number(value);
}

function rowId(periodStart: string, orgId: string, userId: string): string {
  return `${periodStart}:${orgId}:${userId}`;
}

function normalizeOrgUser(key: AiBudgetKey): { orgId: string; userId: string } {
  return { orgId: key.orgId ?? "_", userId: key.userId ?? "_" };
}

export function createKyselyAiBudgetStore(db: Db, options: KyselyAiBudgetStoreOptions): AiBudgetReservationStore {
  const nowFn = options.now ?? (() => new Date());
  const defaults = options.defaults;
  const dialect = options.dialect;

  function withRowLock<Q extends { forUpdate: () => Q }>(query: Q): Q {
    return dialect === "postgres" ? query.forUpdate() : query;
  }

  async function throwExceeded(message: string): Promise<never> {
    const { OtokAiBudgetExceededError } = await import("../../errors.js");
    throw new OtokAiBudgetExceededError(message);
  }

  async function expireStaleReservations(trx: Transaction<AiBudgetDatabase>): Promise<void> {
    const now = nowFn().toISOString();
    const stale = await trx
      .selectFrom(RESERVATIONS_TABLE)
      .selectAll()
      .where("status", "=", "held")
      .where("expires_at", "<", now)
      .execute();

    for (const reservation of stale) {
      await releaseHeldReservation(trx, reservation);
      await trx
        .updateTable(RESERVATIONS_TABLE)
        .set({ status: "expired", settled_at: now })
        .where("request_id", "=", reservation.request_id)
        .execute();
    }
  }

  async function releaseHeldReservation(
    trx: Transaction<AiBudgetDatabase>,
    reservation: AiBudgetDatabase[typeof RESERVATIONS_TABLE],
  ): Promise<void> {
    const userRow = await lockUsageRow(trx, reservation.period_start, reservation.org_id, reservation.user_id);
    if (userRow) {
      await trx
        .updateTable(USAGE_TABLE)
        .set({
          tokens_reserved: Math.max(0, userRow.tokensReserved - reservation.estimated_tokens),
          cost_micro_usd_reserved: String(
            Math.max(0, userRow.costMicroUsdReserved - microFromDb(reservation.estimated_cost_micro_usd)),
          ),
          updated_at: nowFn().toISOString(),
        })
        .where("id", "=", userRow.id)
        .execute();
    }
    if (reservation.org_id !== "_") {
      const orgRow = await lockUsageRow(trx, reservation.period_start, reservation.org_id, ORG_USER_SENTINEL);
      if (orgRow) {
        await trx
          .updateTable(USAGE_TABLE)
          .set({
            cost_micro_usd_reserved: String(
              Math.max(0, orgRow.costMicroUsdReserved - microFromDb(reservation.estimated_cost_micro_usd)),
            ),
            updated_at: nowFn().toISOString(),
          })
          .where("id", "=", orgRow.id)
          .execute();
      }
    }
  }

  async function lockUsageRow(
    trx: Transaction<AiBudgetDatabase>,
    periodStart: string,
    orgId: string,
    userId: string,
  ): Promise<{
    id: string;
    tokensReserved: number;
    costMicroUsdReserved: number;
    tokensUsed: number;
    costMicroUsdUsed: number;
    periodStart: string;
    periodEnd: string;
  } | null> {
    const { start, end } = periodBounds(nowFn());
    const id = rowId(periodStart, orgId, userId);
    let row = await withRowLock(trx.selectFrom(USAGE_TABLE).selectAll().where("id", "=", id)).executeTakeFirst();

    if (!row || !isWithinPeriod(nowFn(), String(row.period_start), String(row.period_end))) {
      const existing = row;
      if (existing && !isWithinPeriod(nowFn(), String(existing.period_start), String(existing.period_end))) {
        await trx
          .updateTable(USAGE_TABLE)
          .set({
            period_start: start,
            period_end: end,
            tokens_used: 0,
            tokens_reserved: 0,
            cost_micro_usd_used: "0",
            cost_micro_usd_reserved: "0",
            updated_at: nowFn().toISOString(),
          })
          .where("id", "=", id)
          .execute();
      } else if (!existing) {
        await trx
          .insertInto(USAGE_TABLE)
          .values({
            id,
            period_start: start,
            period_end: end,
            org_id: orgId,
            user_id: userId,
            tokens_used: 0,
            tokens_reserved: 0,
            cost_micro_usd_used: "0",
            cost_micro_usd_reserved: "0",
            updated_at: nowFn().toISOString(),
          })
          .execute();
      }
      row = await withRowLock(trx.selectFrom(USAGE_TABLE).selectAll().where("id", "=", id)).executeTakeFirst();
    }

    if (!row) return null;
    return {
      id: row.id,
      tokensUsed: Number(row.tokens_used),
      tokensReserved: Number(row.tokens_reserved),
      costMicroUsdUsed: microFromDb(row.cost_micro_usd_used),
      costMicroUsdReserved: microFromDb(row.cost_micro_usd_reserved),
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
    };
  }

  function assertLimitsOnSnapshots(
    key: AiBudgetKey,
    estimatedTokens: number,
    estimatedCostMicroUsd: number,
    user: UsageSnapshot,
    org: UsageSnapshot | null,
  ): void {
    const limits = resolveBudgetLimits(key, defaults);
    if (limits.maxTokensPerRequest !== undefined) {
      const est = normalizeTokenCount(estimatedTokens);
      if (est > limits.maxTokensPerRequest) throw new Error("PER_REQUEST");
    }
    if (limits.maxTokensPerPeriod !== undefined) {
      const used = user.tokensUsed + user.tokensReserved;
      const est = normalizeTokenCount(estimatedTokens);
      if (used >= limits.maxTokensPerPeriod || used + est > limits.maxTokensPerPeriod) throw new Error("USER_TOKENS");
    }
    if (limits.maxCostMicroUsdPerUser !== undefined) {
      const used = user.costMicroUsdUsed + user.costMicroUsdReserved;
      if (used >= limits.maxCostMicroUsdPerUser || used + estimatedCostMicroUsd > limits.maxCostMicroUsdPerUser) {
        throw new Error("USER_COST");
      }
    }
    if (org && limits.maxCostMicroUsdPerOrg !== undefined) {
      const used = org.costMicroUsdUsed + org.costMicroUsdReserved;
      if (used >= limits.maxCostMicroUsdPerOrg || used + estimatedCostMicroUsd > limits.maxCostMicroUsdPerOrg) {
        throw new Error("ORG_COST");
      }
    }
  }

  return {
    async check(key, estimatedTokens = 0) {
      await db.transaction().execute(async (trx) => {
        await expireStaleReservations(trx);
        const { orgId, userId } = normalizeOrgUser(key);
        const { start } = periodBounds(nowFn());
        const userLocked = await lockUsageRow(trx, start, orgId, userId);
        const orgLocked = key.orgId ? await lockUsageRow(trx, start, key.orgId, ORG_USER_SENTINEL) : null;
        const userSnap: UsageSnapshot = {
          tokensUsed: userLocked?.tokensUsed ?? 0,
          tokensReserved: userLocked?.tokensReserved ?? 0,
          costMicroUsdUsed: userLocked?.costMicroUsdUsed ?? 0,
          costMicroUsdReserved: userLocked?.costMicroUsdReserved ?? 0,
          periodStart: userLocked?.periodStart ?? start,
          periodEnd: userLocked?.periodEnd ?? periodBounds(nowFn()).end,
        };
        const orgSnap = orgLocked
          ? {
              tokensUsed: orgLocked.tokensUsed,
              tokensReserved: orgLocked.tokensReserved,
              costMicroUsdUsed: orgLocked.costMicroUsdUsed,
              costMicroUsdReserved: orgLocked.costMicroUsdReserved,
              periodStart: orgLocked.periodStart,
              periodEnd: orgLocked.periodEnd,
            }
          : null;
        try {
          assertLimitsOnSnapshots(key, estimatedTokens, 0, userSnap, orgSnap);
        } catch (error) {
          if (error instanceof Error && error.message === "PER_REQUEST") {
            await throwExceeded("Per-request token budget exceeded");
          }
          if (error instanceof Error && error.message === "USER_TOKENS") {
            await throwExceeded(`Token budget exceeded for ${orgId}:${userId}`);
          }
          if (error instanceof Error && error.message === "USER_COST") {
            await throwExceeded(`Cost budget exceeded for ${orgId}:${userId}`);
          }
          if (error instanceof Error && error.message === "ORG_COST") {
            await throwExceeded(`Org cost budget exceeded for ${key.orgId}`);
          }
          throw error;
        }
      });
    },

    async record(key, usage: AiUsage) {
      const tokens = normalizeTokenCount(usage.totalTokens);
      const costMicro = usageCostMicroUsd(usage);
      const { orgId, userId } = normalizeOrgUser(key);
      const { start } = periodBounds(nowFn());

      await db.transaction().execute(async (trx) => {
        await expireStaleReservations(trx);
        const user = await lockUsageRow(trx, start, orgId, userId);
        if (!user) return;
        await trx
          .updateTable(USAGE_TABLE)
          .set({
            tokens_used: user.tokensUsed + tokens,
            cost_micro_usd_used: String(user.costMicroUsdUsed + costMicro),
            updated_at: nowFn().toISOString(),
          })
          .where("id", "=", user.id)
          .execute();

        if (key.orgId) {
          const org = await lockUsageRow(trx, start, key.orgId, ORG_USER_SENTINEL);
          if (org) {
            await trx
              .updateTable(USAGE_TABLE)
              .set({
                cost_micro_usd_used: String(org.costMicroUsdUsed + costMicro),
                updated_at: nowFn().toISOString(),
              })
              .where("id", "=", org.id)
              .execute();
          }
        }
      });
    },

    async getUsage(key) {
      const { orgId, userId } = normalizeOrgUser(key);
      const { start } = periodBounds(nowFn());
      const id = rowId(start, orgId, userId);
      const row = await db.selectFrom(USAGE_TABLE).selectAll().where("id", "=", id).executeTakeFirst();
      if (!row || !isWithinPeriod(nowFn(), String(row.period_start), String(row.period_end))) return null;
      return {
        key: `${orgId}:${userId}`,
        tokensUsed: Number(row.tokens_used),
        costUsd: microUsdToUsd(microFromDb(row.cost_micro_usd_used)),
        periodStart: String(row.period_start),
        periodEnd: String(row.period_end),
      } satisfies AiBudgetRecord;
    },

    async acquireReservation(input: AcquireReservationInput) {
      const estTokens = normalizeTokenCount(input.estimatedTokens);
      const estCost = input.estimatedCostMicroUsd ?? 0;
      if (!Number.isFinite(estCost) || estCost < 0) throw new RangeError("Invalid estimatedCostMicroUsd");

      return db.transaction().execute(async (trx) => {
        await expireStaleReservations(trx);
        const existing = await trx
          .selectFrom(RESERVATIONS_TABLE)
          .selectAll()
          .where("request_id", "=", input.requestId)
          .executeTakeFirst();
        if (existing) {
          return { requestId: input.requestId, status: "existing" as const };
        }

        const { orgId, userId } = normalizeOrgUser(input.key);
        const { start } = periodBounds(nowFn());
        const userLocked = await lockUsageRow(trx, start, orgId, userId);
        const orgLocked = input.key.orgId ? await lockUsageRow(trx, start, input.key.orgId, ORG_USER_SENTINEL) : null;

        const userSnap: UsageSnapshot = {
          tokensUsed: userLocked!.tokensUsed,
          tokensReserved: userLocked!.tokensReserved,
          costMicroUsdUsed: userLocked!.costMicroUsdUsed,
          costMicroUsdReserved: userLocked!.costMicroUsdReserved,
          periodStart: userLocked!.periodStart,
          periodEnd: userLocked!.periodEnd,
        };
        const orgSnap = orgLocked
          ? {
              tokensUsed: orgLocked.tokensUsed,
              tokensReserved: orgLocked.tokensReserved,
              costMicroUsdUsed: orgLocked.costMicroUsdUsed,
              costMicroUsdReserved: orgLocked.costMicroUsdReserved,
              periodStart: orgLocked.periodStart,
              periodEnd: orgLocked.periodEnd,
            }
          : null;

        try {
          assertLimitsOnSnapshots(input.key, estTokens, estCost, userSnap, orgSnap);
        } catch {
          await throwExceeded(`Reservation would exceed budget for ${orgId}:${userId}`);
        }

        await trx
          .insertInto(RESERVATIONS_TABLE)
          .values({
            request_id: input.requestId,
            period_start: start,
            org_id: orgId,
            user_id: userId,
            estimated_tokens: estTokens,
            estimated_cost_micro_usd: String(estCost),
            status: "held",
            expires_at: input.expiresAt,
            settled_at: null,
            usage_json: null,
          })
          .execute();

        await trx
          .updateTable(USAGE_TABLE)
          .set({
            tokens_reserved: userLocked!.tokensReserved + estTokens,
            cost_micro_usd_reserved: String(userLocked!.costMicroUsdReserved + estCost),
            updated_at: nowFn().toISOString(),
          })
          .where("id", "=", userLocked!.id)
          .execute();

        if (orgLocked && input.key.orgId) {
          await trx
            .updateTable(USAGE_TABLE)
            .set({
              cost_micro_usd_reserved: String(orgLocked.costMicroUsdReserved + estCost),
              updated_at: nowFn().toISOString(),
            })
            .where("id", "=", orgLocked.id)
            .execute();
        }

        return { requestId: input.requestId, status: "held" as const };
      });
    },

    async settleReservation(input: SettleReservationInput) {
      await db.transaction().execute(async (trx) => {
        await expireStaleReservations(trx);
        const reservation = await withRowLock(
          trx.selectFrom(RESERVATIONS_TABLE).selectAll().where("request_id", "=", input.requestId),
        ).executeTakeFirst();
        if (!reservation || reservation.status !== "held") return;

        const userLocked = await lockUsageRow(
          trx,
          String(reservation.period_start),
          reservation.org_id,
          reservation.user_id,
        );
        if (!userLocked) return;

        const estCost = microFromDb(reservation.estimated_cost_micro_usd);
        await trx
          .updateTable(USAGE_TABLE)
          .set({
            tokens_reserved: Math.max(0, userLocked.tokensReserved - reservation.estimated_tokens),
            cost_micro_usd_reserved: String(Math.max(0, userLocked.costMicroUsdReserved - estCost)),
            updated_at: nowFn().toISOString(),
          })
          .where("id", "=", userLocked.id)
          .execute();

        if (reservation.org_id !== "_") {
          const orgLocked = await lockUsageRow(
            trx,
            String(reservation.period_start),
            reservation.org_id,
            ORG_USER_SENTINEL,
          );
          if (orgLocked) {
            await trx
              .updateTable(USAGE_TABLE)
              .set({
                cost_micro_usd_reserved: String(Math.max(0, orgLocked.costMicroUsdReserved - estCost)),
                updated_at: nowFn().toISOString(),
              })
              .where("id", "=", orgLocked.id)
              .execute();
          }
        }

        if (!input.unknownUsage && input.usage) {
          const tokens = normalizeTokenCount(input.usage.totalTokens);
          const costMicro = usageCostMicroUsd(input.usage);
          const refreshed = await lockUsageRow(
            trx,
            String(reservation.period_start),
            reservation.org_id,
            reservation.user_id,
          );
          if (refreshed) {
            await trx
              .updateTable(USAGE_TABLE)
              .set({
                tokens_used: refreshed.tokensUsed + tokens,
                cost_micro_usd_used: String(refreshed.costMicroUsdUsed + costMicro),
                updated_at: nowFn().toISOString(),
              })
              .where("id", "=", refreshed.id)
              .execute();
          }
          if (reservation.org_id !== "_") {
            const org = await lockUsageRow(
              trx,
              String(reservation.period_start),
              reservation.org_id,
              ORG_USER_SENTINEL,
            );
            if (org) {
              await trx
                .updateTable(USAGE_TABLE)
                .set({
                  cost_micro_usd_used: String(org.costMicroUsdUsed + costMicro),
                  updated_at: nowFn().toISOString(),
                })
                .where("id", "=", org.id)
                .execute();
            }
          }
        }

        await trx
          .updateTable(RESERVATIONS_TABLE)
          .set({
            status: "settled",
            settled_at: nowFn().toISOString(),
            usage_json: input.usage ? JSON.stringify(input.usage) : null,
          })
          .where("request_id", "=", input.requestId)
          .execute();
      });
    },

    async releaseReservation(input: ReleaseReservationInput) {
      await db.transaction().execute(async (trx) => {
        const reservation = await withRowLock(
          trx.selectFrom(RESERVATIONS_TABLE).selectAll().where("request_id", "=", input.requestId),
        ).executeTakeFirst();
        if (!reservation || reservation.status !== "held") return;
        await releaseHeldReservation(trx, reservation);
        await trx
          .updateTable(RESERVATIONS_TABLE)
          .set({ status: "released", settled_at: nowFn().toISOString() })
          .where("request_id", "=", input.requestId)
          .execute();
      });
    },
  };
}
