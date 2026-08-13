# @kamod-ch/otok-stripe

Stripe Checkout, Customer Portal, and webhooks for [Otok](https://github.com/kamod-ch/otok) apps.

Provider-based integration with a typed Otok plugin, safe client DTOs, idempotent webhook processing, and a test provider for local development.

## Install

```bash
pnpm add @kamod-ch/otok-stripe stripe hono @kamod-ch/otok
```

## Plugin

```ts
import { defineConfig } from "@kamod-ch/otok";
import stripe from "@kamod-ch/otok-stripe";

export default defineConfig({
  plugins: [
    stripe({
      provider: { type: "live" },
      webhookPath: "/api/billing/webhook",
    }),
  ],
});
```

Use `{ type: "test" }` in development and tests — no Stripe API calls.

## Typed actions (safe client payloads)

```ts
import { stripeCheckoutAction, stripePortalAction, stripeBillingStatusAction } from "@kamod-ch/otok-stripe";

// Returns { sessionId, url } — never raw Stripe objects
const checkout = await stripeCheckoutAction({
  plan: "launch",
  priceId: process.env.STRIPE_PRICE_LAUNCH!,
  workspaceId,
  userId,
  successUrl: `${appUrl}/billing?success=1`,
  cancelUrl: `${appUrl}/billing?cancelled=1`,
});

const status = await stripeBillingStatusAction(adapter, workspaceId, "active");
```

## Billing adapter

Apps own persistence via `BillingAdapter`:

```ts
import type { BillingAdapter } from "@kamod-ch/otok-stripe/adapter";
```

## Webhooks with idempotency

Mount via plugin + adapter in `configureStripeApp`, or use the low-level handler from `@kamod-ch/otok-stripe/webhook`.

Plugin webhooks deduplicate by Stripe event ID — retries return `{ received: true, duplicate: true }` without double-processing.

## Providers

| Provider | Config | Notes |
|----------|--------|-------|
| `live` | `{ type: "live", secretKey? }` | Real Stripe SDK. Uses `STRIPE_SECRET_KEY` when omitted. |
| `test` | `{ type: "test" }` | Deterministic checkout/portal URLs and webhook parsing for tests. |

## Composition API (still supported)

Direct helpers remain available without the plugin:

- `createStripeClient`
- `createCheckoutSession`
- `createBillingPortalSession`
- `createStripeWebhookHandler`

## Env vars

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-stripe` | Plugin, actions, DTOs, providers |
| `@kamod-ch/otok-stripe/adapter` | `BillingAdapter` contract |
| `@kamod-ch/otok-stripe/webhook` | Low-level webhook handler |
| `@kamod-ch/otok-stripe/providers/test` | Test provider helpers |
