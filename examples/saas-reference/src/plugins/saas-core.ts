import { definePlugin } from "@kamod-ch/otok";
import { configureAuditApp } from "@kamod-ch/otok-audit/plugin";
import { createKyselyAuditStore } from "@kamod-ch/otok-audit/providers/kysely";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import {
  createMemoryEventIdempotencyStore,
  getStripeRuntime,
  processStripeEventIdempotently,
} from "@kamod-ch/otok-stripe";
import { dispatchStripeEvent } from "@kamod-ch/otok-stripe/webhook";
import type { StripePluginOptions } from "@kamod-ch/otok-stripe";
import type { SaasDatabase } from "../db/types.js";
import { createBillingAdapter, registerStripePrice } from "../lib/billing-adapter.js";
import { createKyselyStripeEventStore } from "../lib/stripe-idempotency.js";

export interface SaasCorePluginOptions {
  stripe: StripePluginOptions;
  stripePricePro?: string;
  stripePriceTeam?: string;
}

const saasCoreFactory = definePlugin<SaasCorePluginOptions>({
  name: "otok-reference-saas-core",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") throw new Error("saasCore() requires options");
      return input as SaasCorePluginOptions;
    },
  },
});

/** Wires Kysely audit store, Postgres Stripe idempotency, and billing webhooks. */
export default function saasCore(options: SaasCorePluginOptions) {
  if (options.stripePricePro) registerStripePrice("pro", options.stripePricePro);
  if (options.stripePriceTeam) registerStripePrice("team", options.stripePriceTeam);

  const plugin = saasCoreFactory(options);

  plugin.configureApp = async ({ app }) => {
    const { db } = getKyselyRuntime<SaasDatabase>();

    configureAuditApp(app, {
      provider: {
        type: "custom",
        store: createKyselyAuditStore(db as never),
      },
      redactFields: ["password", "token", "token_hash"],
    });

    const adapter = createBillingAdapter(db);
    const idempotencyStore = createKyselyStripeEventStore(db);
    const memoryFallback = createMemoryEventIdempotencyStore();
    const store = {
      hasProcessed: async (eventId: string) =>
        (await idempotencyStore.hasProcessed(eventId)) || memoryFallback.hasProcessed(eventId),
      markProcessed: async (eventId: string) => {
        await idempotencyStore.markProcessed(eventId);
        await memoryFallback.markProcessed(eventId);
      },
    };

    const { provider, webhookPath, webhookSecret } = getStripeRuntime();
    if (!webhookSecret) return;

    app.post(webhookPath, async (c) => {
      const signature = c.req.header("stripe-signature");
      if (!signature) {
        return c.json({ error: { code: "missing_signature", message: "Missing stripe-signature header" } }, 400);
      }

      const rawBody = await c.req.text();
      let event;
      try {
        event = provider.constructWebhookEvent(rawBody, signature, webhookSecret);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid signature";
        return c.json({ error: { code: "invalid_signature", message } }, 400);
      }

      const { duplicate, result } = await processStripeEventIdempotently(store, event.id, async () =>
        dispatchStripeEvent(adapter, event),
      );

      return c.json({ received: true, duplicate, updated: Boolean(result) });
    });
  };

  return plugin;
}
