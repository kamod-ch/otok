import type Stripe from "stripe";

export type CheckoutMode = "subscription" | "payment";

export interface StripeClientConfig {
  secretKey: string;
  /** Stripe API version override. Defaults to the SDK default. */
  apiVersion?: Stripe.LatestApiVersion;
}

export interface CheckoutSessionInput<TPlan extends string = string> {
  /** App plan key (e.g. "launch" | "pro"). Stored in session metadata. */
  plan: TPlan;
  /** Stripe Price ID for this plan. */
  priceId: string;
  workspaceId: string;
  userId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  mode?: CheckoutMode;
  /** Extra metadata merged into the Checkout Session. */
  metadata?: Record<string, string>;
  quantity?: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface BillingRecord<TPlan extends string = string> {
  workspaceId: string;
  plan: TPlan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  updatedAt: string;
}
