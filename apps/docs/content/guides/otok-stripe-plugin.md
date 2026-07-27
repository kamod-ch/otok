---
title: Stripe Extension
section: Guides
order: 37
---
# @kamod-ch/otok-stripe

Stripe billing with a provider interface, typed Otok actions, idempotent webhooks, and safe client DTOs.

## Providers

| Provider | Use case |
|----------|----------|
| `live` | Production/test mode via Stripe SDK |
| `test` | Deterministic local behavior without API calls |

## Plugin

```ts
import stripe from "@kamod-ch/otok-stripe";

export default defineConfig({
  plugins: [
    stripe({
      provider: { type: "test" },
      webhookPath: "/api/billing/webhook",
    }),
  ],
});
```

## Typed actions

```ts
import { stripeCheckoutAction, stripeBillingStatusAction } from "@kamod-ch/otok-stripe";

const checkout = await stripeCheckoutAction({ /* ... */ });
// Returns { sessionId, url } — no raw Stripe objects
```

Persistence stays in your app via `BillingAdapter`. Webhook events are deduplicated by Stripe event ID.

See [`packages/otok-stripe/README.md`](https://github.com/kamod-ch/otok/tree/main/packages/otok-stripe).
