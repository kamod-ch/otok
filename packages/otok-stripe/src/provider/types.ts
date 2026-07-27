import type Stripe from "stripe";
import type { BillingPortalSessionInput, BillingPortalSessionResult } from "../portal.js";
import type { CheckoutSessionInput, CheckoutSessionResult } from "../types.js";

export interface StripeProviderCapabilities {
  checkout: boolean;
  portal: boolean;
  webhooks: boolean;
  liveMode: boolean;
}

export interface StripeProvider<TPlan extends string = string> {
  readonly name: string;
  readonly capabilities: StripeProviderCapabilities;
  readonly client: Stripe;
  createCheckoutSession(input: CheckoutSessionInput<TPlan>): Promise<CheckoutSessionResult>;
  createBillingPortalSession(input: BillingPortalSessionInput): Promise<BillingPortalSessionResult>;
  constructWebhookEvent(rawBody: string, signature: string, secret: string): Stripe.Event;
}

export type LiveStripeProviderConfig = {
  type: "live";
  secretKey?: string;
  secretKeyEnv?: string;
};

export type TestStripeProviderConfig = {
  type: "test";
};

export type StripeProviderConfig = LiveStripeProviderConfig | TestStripeProviderConfig;

export interface StripePluginOptions<TPlan extends string = string> {
  provider: StripeProviderConfig;
  webhookPath?: string;
  webhookSecret?: string;
  webhookSecretEnv?: string;
}

export interface StripeRuntime<TPlan extends string = string> {
  provider: StripeProvider<TPlan>;
  webhookPath: string;
  webhookSecret?: string;
}
