import type Stripe from "stripe";
import { createBillingPortalSession } from "../portal.js";
import { createCheckoutSession } from "../checkout.js";
import { createStripeClient } from "../client.js";
import { OtokStripeConfigError } from "../errors.js";
import type { LiveStripeProviderConfig, StripeProvider } from "../provider/types.js";

function resolveSecretKey(config: LiveStripeProviderConfig): string {
  const key = config.secretKey ?? process.env[config.secretKeyEnv ?? "STRIPE_SECRET_KEY"];
  if (!key?.trim()) {
    throw new OtokStripeConfigError(
      "live stripe provider requires secretKey or STRIPE_SECRET_KEY environment variable",
    );
  }
  return key.trim();
}

export function createLiveStripeProvider<TPlan extends string = string>(
  config: LiveStripeProviderConfig,
): StripeProvider<TPlan> {
  const secretKey = resolveSecretKey(config);
  const client = createStripeClient({ secretKey });

  return {
    name: "live",
    capabilities: {
      checkout: true,
      portal: true,
      webhooks: true,
      liveMode: !secretKey.startsWith("sk_test"),
    },
    client,
    createCheckoutSession: (input) => createCheckoutSession(client, input),
    createBillingPortalSession: (input) => createBillingPortalSession(client, input),
    constructWebhookEvent: (rawBody, signature, secret) =>
      client.webhooks.constructEvent(rawBody, signature, secret),
  };
}

export type { StripeProvider };
