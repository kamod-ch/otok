# @kamod-ch/otok-stripe

Stripe Checkout Sessions and webhook helpers for [Otok](https://github.com/kamod-ch/otok) apps.

This package is **composition, not a plugin**. Persistence stays in your app via a `BillingAdapter`. Otok core stays free of Stripe dependencies.

## Install

```bash
pnpm add @kamod-ch/otok-stripe stripe hono otok
```

## Checkout Session

```ts
import { createStripeClient, createCheckoutSession } from "@kamod-ch/otok-stripe";

const stripe = createStripeClient({ secretKey: process.env.STRIPE_SECRET_KEY! });

const { url } = await createCheckoutSession(stripe, {
  plan: "launch",
  priceId: process.env.STRIPE_PRICE_LAUNCH!,
  workspaceId: user.workspaceId,
  userId: user.id,
  customerEmail: user.email,
  successUrl: `${appUrl}/studio/abrechnung?checkout=success`,
  cancelUrl: `${appUrl}/studio/abrechnung?checkout=cancelled`,
  mode: "subscription",
});

// Redirect the browser to `url`
```

Session metadata always includes `workspaceId`, `userId`, and `plan` so webhooks can update your store.

## Billing adapter

```ts
import type { BillingAdapter } from "@kamod-ch/otok-stripe/adapter";

type Plan = "free" | "launch" | "pro";

const adapter: BillingAdapter<Plan> = {
  freePlan: "free",
  async getRecord(workspaceId) { /* load from DB/file */ },
  async upsertRecord(record) { /* persist */ },
  resolvePlanFromPriceId(priceId) {
    if (priceId === process.env.STRIPE_PRICE_LAUNCH) return "launch";
    if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
    return null;
  },
};
```

## Webhook handler

Register on a Hono route via `createOtokApp({ configure })`. Use the **raw body** for signature verification — do not parse JSON first.

```ts
import { createStripeWebhookHandler } from "@kamod-ch/otok-stripe/webhook";

configure: (app) => {
  app.post(
    "/api/billing/webhook",
    createStripeWebhookHandler({
      stripe,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      adapter,
    }),
  );
};
```

Handled events:

| Event | Effect |
|-------|--------|
| `checkout.session.completed` | Upsert plan from session metadata |
| `customer.subscription.updated` | Sync plan (active → plan, otherwise free) |
| `customer.subscription.deleted` | Downgrade to `freePlan` |

Local testing with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-stripe` | `createStripeClient`, `createCheckoutSession`, shared types |
| `@kamod-ch/otok-stripe/adapter` | `BillingAdapter`, `BillingRecord` |
| `@kamod-ch/otok-stripe/webhook` | `createStripeWebhookHandler`, event helpers |

## Env vars (app)

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_LAUNCH=
STRIPE_PRICE_PRO=
APP_URL=http://localhost:3000
```
