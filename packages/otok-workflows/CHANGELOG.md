# @kamod-ch/otok-workflows

## 2.1.0

### Minor Changes

- 3a98f5e: Add lease renewal and token-fenced instance/step writes (`renewLease`, `updateInstanceIfHeld`, `saveStepIfHeld`). The engine renews leases during claimed execution and surfaces `LEASE_LOST` when a worker loses its lease. Unclaimed `execute` is rejected while another worker holds an active lease.
- 00aac39: Harden durable workflows: atomic lease claims, persistent pause/cancel, workflow-level runAttempts, cron dedupe wiring, schema version pins, JSONB-safe parsing, and documented at-least-once step replay semantics.
- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

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
