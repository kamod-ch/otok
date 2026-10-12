# @kamod-ch/otok-queue

## 2.1.0

### Minor Changes

- 00aac39: Add PostgreSQL queue provider with lease-based claiming, worker runtime, cron dedupe, and `PostgresIdempotencyStore` for durable HTTP idempotency. Document at-least-once delivery in ADR-001.
- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Require explicit Postgres test URL when OTOK_REQUIRE_DATABASE_TESTS=1; CI runs queue integration against an isolated Postgres 16 service.
- 00aac39: Add activateQueueRuntime for custom Postgres queue wiring and the devjobs-reference example app.
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

## 1.0.0

### Patch Changes

- Updated dependencies [2e24c99]
- Updated dependencies [15b45d9]
- Updated dependencies
  - otok@0.4.0
