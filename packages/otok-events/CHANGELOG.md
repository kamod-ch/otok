# @kamod-ch/otok-events

## 2.1.0

### Minor Changes

- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Harden the Kysely and in-memory outbox for multi-worker processing: additive `LeasedOutboxStore` with atomic `claimLeased`, lease renewal, and token-bound ack/retry/dead operations. `OutboxProcessor` uses leased claims automatically when available. Schema migration adds `lease_token` and `lease_expires_at` columns idempotently. Delivery remains at-least-once; consumers must stay idempotent.
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies
- Updated dependencies [00aac39]
  - @kamod-ch/otok@2.1.0
  - @kamod-ch/otok-config@2.1.0

## 0.1.1

### Patch Changes

- Updated dependencies [620dce6]
  - otok@0.6.0
  - @kamod-ch/otok-config@0.3.0
