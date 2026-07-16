import type { Context } from "hono";
import type Stripe from "stripe";
import type { BillingAdapter } from "../adapter/types.js";
import type { BillingRecord } from "../types.js";
import { dispatchStripeEvent } from "./events.js";

export interface StripeWebhookHandlerOptions<TPlan extends string = string> {
  stripe: Stripe;
  webhookSecret: string;
  adapter: BillingAdapter<TPlan>;
  /** Called after a handled event updates billing state. */
  onRecord?: (record: BillingRecord<TPlan>, event: Stripe.Event) => void | Promise<void>;
  /** Called for events that produce no billing update (ignored types). */
  onIgnored?: (event: Stripe.Event) => void | Promise<void>;
}

/**
 * Returns a Hono route handler for Stripe webhooks.
 * Uses the raw request body for signature verification — do not parse JSON first.
 */
export function createStripeWebhookHandler<TPlan extends string = string>(
  options: StripeWebhookHandlerOptions<TPlan>,
) {
  return async (c: Context) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: { code: "missing_signature", message: "Missing stripe-signature header" } }, 400);
    }

    const rawBody = await c.req.text();
    let event: Stripe.Event;
    try {
      event = options.stripe.webhooks.constructEvent(rawBody, signature, options.webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid signature";
      return c.json({ error: { code: "invalid_signature", message } }, 400);
    }

    const record = await dispatchStripeEvent(options.adapter, event);
    if (record) {
      await options.onRecord?.(record, event);
    } else {
      await options.onIgnored?.(event);
    }

    return c.json({ received: true });
  };
}
