import type { Kysely } from "kysely";
import type { BillingAdapter } from "@kamod-ch/otok-stripe/adapter";
import type { BillingRecord } from "@kamod-ch/otok-stripe";
import type { SaasDatabase, SaasPlan } from "../db/types.js";

const PRICE_TO_PLAN: Record<string, SaasPlan> = {};

export function registerStripePrice(plan: SaasPlan, priceId: string): void {
  if (priceId) PRICE_TO_PLAN[priceId] = plan;
}

export function createBillingAdapter(db: Kysely<SaasDatabase>): BillingAdapter<SaasPlan> {
  return {
    freePlan: "free",
    resolvePlanFromPriceId(priceId) {
      return PRICE_TO_PLAN[priceId] ?? null;
    },
    async getRecord(workspaceId) {
      const row = await db
        .selectFrom("billing_record")
        .selectAll()
        .where("workspace_id", "=", workspaceId)
        .executeTakeFirst();
      if (!row) return null;
      return toBillingRecord(row);
    },
    async upsertRecord(record) {
      await db
        .insertInto("billing_record")
        .values({
          workspace_id: record.workspaceId,
          plan: record.plan,
          stripe_customer_id: record.stripeCustomerId,
          stripe_subscription_id: record.stripeSubscriptionId,
          updated_at: record.updatedAt,
        })
        .onConflict((oc) =>
          oc.column("workspace_id").doUpdateSet({
            plan: record.plan,
            stripe_customer_id: record.stripeCustomerId,
            stripe_subscription_id: record.stripeSubscriptionId,
            updated_at: record.updatedAt,
          }),
        )
        .execute();
    },
  };
}

function toBillingRecord(row: SaasDatabase["billing_record"]): BillingRecord<SaasPlan> {
  return {
    workspaceId: row.workspace_id,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    updatedAt: row.updated_at,
  };
}

export async function ensureBillingRecord(
  db: Kysely<SaasDatabase>,
  orgId: string,
  plan: SaasPlan = "free",
): Promise<void> {
  const existing = await db
    .selectFrom("billing_record")
    .select("workspace_id")
    .where("workspace_id", "=", orgId)
    .executeTakeFirst();
  if (existing) return;

  await db
    .insertInto("billing_record")
    .values({
      workspace_id: orgId,
      plan,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .execute();
}

export async function getOrgPlan(db: Kysely<SaasDatabase>, orgId: string): Promise<SaasPlan> {
  const row = await db
    .selectFrom("billing_record")
    .select("plan")
    .where("workspace_id", "=", orgId)
    .executeTakeFirst();
  return row?.plan ?? "free";
}
