# @kamod-ch/otok-ai

## 2.1.0

### Minor Changes

- 3a98f5e: Add optional Kysely Postgres AI budget store with atomic reservations, UTC month rollover on memory/Kysely stores, and client acquire/settle integration. Export `@kamod-ch/otok-ai/budget/kysely`, reservation types, and `beginBilledRound` / `isAiBudgetReservationStore`.
- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Apply budget gates, redaction, and per-round usage recording to ai.agent() and tool-loop rounds.
- 3a98f5e: Fix stream operation timeouts so `timeoutMs` covers full async iterator consumption (including blocked `next()` and tool rounds), distinguish user abort from client timeout, remove merged-signal listener leaks, and cancel tee sources when both branches close early.
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies
- Updated dependencies [00aac39]
  - @kamod-ch/otok@2.1.0
  - @kamod-ch/otok-workflows@2.1.0
