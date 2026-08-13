import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import { createStripeProvider } from "./factory.js";
import { OtokStripeConfigError } from "./errors.js";
import { registerStripeRuntime } from "./registry.js";
import type { BillingAdapter } from "./adapter/types.js";
import type { StripePluginOptions, StripeRuntime } from "./provider/types.js";
import { createMemoryEventIdempotencyStore, processStripeEventIdempotently } from "./idempotency.js";
import { dispatchStripeEvent } from "./webhook/events.js";

let idempotencyStore = createMemoryEventIdempotencyStore();

/** @internal Test helper */
export function resetStripeIdempotencyForTests(): void {
  idempotencyStore = createMemoryEventIdempotencyStore();
}

export function getStripeIdempotencyStore() {
  return idempotencyStore;
}

function resolveWebhookSecret(options: StripePluginOptions): string | undefined {
  return options.webhookSecret ?? process.env[options.webhookSecretEnv ?? "STRIPE_WEBHOOK_SECRET"]?.trim();
}

export async function configureStripeApp<TPlan extends string = string>(
  app: Hono,
  options: StripePluginOptions<TPlan>,
  adapter?: BillingAdapter<TPlan>,
): Promise<StripeRuntime<TPlan>> {
  const provider = createStripeProvider<TPlan>(options.provider);
  const webhookPath = options.webhookPath ?? "/api/billing/webhook";
  const webhookSecret = resolveWebhookSecret(options);

  const runtime: StripeRuntime<TPlan> = {
    provider,
    webhookPath,
    webhookSecret,
  };

  registerStripeRuntime(runtime);

  if (adapter && webhookSecret) {
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

      const { duplicate, result } = await processStripeEventIdempotently(idempotencyStore, event.id, async () =>
        dispatchStripeEvent(adapter, event),
      );

      return c.json({ received: true, duplicate, updated: Boolean(result) });
    });
  }

  return runtime;
}

const stripePluginFactory = definePlugin<StripePluginOptions>({
  name: "@kamod-ch/otok-stripe",
  version: "1.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new OtokStripeConfigError("stripe() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.provider || typeof record.provider !== "object") {
        throw new OtokStripeConfigError("stripe() requires provider configuration");
      }
      return input as StripePluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      const secretKey = input.STRIPE_SECRET_KEY;
      const webhookSecret = input.STRIPE_WEBHOOK_SECRET;
      if (secretKey !== undefined && !secretKey) {
        throw new OtokStripeConfigError("STRIPE_SECRET_KEY must not be empty when set");
      }
      if (webhookSecret !== undefined && !webhookSecret) {
        throw new OtokStripeConfigError("STRIPE_WEBHOOK_SECRET must not be empty when set");
      }
      return { stripeSecretKey: secretKey, stripeWebhookSecret: webhookSecret };
    },
  },
});

/**
 * Otok Stripe plugin factory.
 *
 * Webhook routes require passing a BillingAdapter to configureStripeApp or mounting manually.
 */
export default function stripe<TPlan extends string = string>(options: StripePluginOptions<TPlan>) {
  const plugin = stripePluginFactory(options as StripePluginOptions);

  plugin.configureApp = async ({ app }) => {
    await configureStripeApp(app, options);
  };

  return plugin;
}
