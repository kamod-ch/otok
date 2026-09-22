# Extension points — @kamod-ch/otok-kit-saas

## Domain

```ts
import {
  MemoryBillingStore,
  createCheckoutIntent,
  dispatchSaasStripeEvent,
  processWebhookEventIdempotently,
} from "@kamod-ch/otok-kit-saas";
```

Replace `MemoryBillingStore` with a Kysely adapter that implements `SaasBillingAdapter`.

## Routes

| Path                  | Role                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `/billing`            | Plan status + checkout form                                                               |
| `/billing/portal`     | Customer portal entry                                                                     |
| `/api/stripe/webhook` | JSON webhook (dev). Production: `createStripeWebhookHandler` from `@kamod-ch/otok-stripe` |

Override without eject via `mergeKits(..., { overrides })`.

## Stripe wiring

```ts
import { createStripeWebhookHandler } from "@kamod-ch/otok-stripe/webhook";
import { createCheckoutSession, createBillingPortalSession } from "@kamod-ch/otok-stripe";
```

Verify signatures with the Stripe handler. Kit domain `processWebhookEventIdempotently` covers duplicate `event.id`s.

## Permissions

`saas:billing:read`, `saas:subscriptions:manage`, `saas:billing:admin` (or `saas:*`).

## Migrations

`20260814120000_saas_billing` — `saas_plans`, `saas_subscriptions`, `saas_webhook_events`.
