---
"@kamod-ch/otok-events": patch
---

Harden the Kysely and in-memory outbox for multi-worker processing: additive `LeasedOutboxStore` with atomic `claimLeased`, lease renewal, and token-bound ack/retry/dead operations. `OutboxProcessor` uses leased claims automatically when available. Schema migration adds `lease_token` and `lease_expires_at` columns idempotently. Delivery remains at-least-once; consumers must stay idempotent.
