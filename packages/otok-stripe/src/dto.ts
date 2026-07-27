import type { BillingRecord, CheckoutSessionResult } from "./types.js";

/** Safe checkout payload for client redirects — no raw Stripe objects. */
export interface CheckoutSessionDto {
  sessionId: string;
  url: string;
}

/** Safe billing portal payload for client redirects. */
export interface BillingPortalSessionDto {
  url: string;
}

/** Safe subscription snapshot exposed to the client. */
export interface BillingStatusDto<TPlan extends string = string> {
  workspaceId: string;
  plan: TPlan;
  subscriptionStatus: SubscriptionStatus;
  hasActiveSubscription: boolean;
  updatedAt: string;
}

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export function toCheckoutSessionDto(result: CheckoutSessionResult): CheckoutSessionDto {
  return {
    sessionId: result.sessionId,
    url: result.url,
  };
}

export function toBillingStatusDto<TPlan extends string>(
  record: BillingRecord<TPlan> | null,
  subscriptionStatus: SubscriptionStatus = "none",
): BillingStatusDto<TPlan> | null {
  if (!record) return null;
  return {
    workspaceId: record.workspaceId,
    plan: record.plan,
    subscriptionStatus,
    hasActiveSubscription: subscriptionStatus === "active" || subscriptionStatus === "trialing",
    updatedAt: record.updatedAt,
  };
}

export function toBillingPortalSessionDto(result: { url: string }): BillingPortalSessionDto {
  return { url: result.url };
}
