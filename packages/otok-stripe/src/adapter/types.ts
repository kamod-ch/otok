import type { BillingRecord } from "../types.js";

export interface BillingAdapter<TPlan extends string = string> {
  getRecord(workspaceId: string): Promise<BillingRecord<TPlan> | null>;
  upsertRecord(record: BillingRecord<TPlan>): Promise<void>;
  /** Map a Stripe Price ID to an app plan. Used by subscription sync handlers. */
  resolvePlanFromPriceId?(priceId: string): TPlan | null;
  /** Plan used when a subscription is cancelled. Defaults to "free" if not set. */
  freePlan?: TPlan;
}

export type { BillingRecord };
