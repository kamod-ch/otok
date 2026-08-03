# Stripe lokal testen

## Test-Provider (Standard ohne `STRIPE_SECRET_KEY`)

Ohne Live-Key nutzt die App den `@kamod-ch/otok-stripe` Test-Provider:

- Checkout-URLs zeigen auf `https://checkout.test/…`
- Webhooks akzeptieren Signatur `t=1,v1=ok` mit Secret `whsec_test`

### Webhook manuell simulieren

```bash
curl -X POST http://localhost:5173/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=ok" \
  -d '{
    "id": "evt_test_checkout_1",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "metadata": { "workspaceId": "org-demo", "plan": "pro" },
        "customer": "cus_test_1",
        "subscription": "sub_test_1"
      }
    }
  }'
```

Erneuter Aufruf mit gleicher `id` → `"duplicate": true` (Postgres-Tabelle `stripe_event`).

## Stripe CLI (echte Test-Mode-Events)

1. [Stripe CLI](https://stripe.com/docs/stripe-cli) installieren
2. `stripe login`
3. Checkout mit echten Test-Price-IDs in `.env` setzen
4. Webhook forwarden:

```bash
stripe listen --forward-to localhost:5173/api/billing/webhook
```

5. Secret aus CLI-Ausgabe als `STRIPE_WEBHOOK_SECRET` setzen
6. Im Dashboard Billing → Pro/Team wählen und Checkout durchlaufen

## Customer Portal

Nach erfolgreichem Checkout existiert `stripe_customer_id` in `billing_record`. Link **Kundenportal** auf `/dashboard/billing/portal` öffnet Portal-Session (Test-Provider: Mock-URL).

## Preis → Plan Mapping

`STRIPE_PRICE_PRO` und `STRIPE_PRICE_TEAM` werden in `otok.config.ts` an `saasCore()` übergeben und in `billing-adapter.ts` via `resolvePlanFromPriceId` aufgelöst.
