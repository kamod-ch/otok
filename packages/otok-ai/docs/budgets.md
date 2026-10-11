# AI budgets

## Dimensions

| Limit                    | Field                                                    | Semantics                                                            |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| Per request / round      | `maxTokens`                                              | Completion ceiling for a single provider call (not monthly total).   |
| Per UTC month (user)     | `maxTokensPerPeriod` or store default `maxTokensPerUser` | Cumulative tokens for `(orgId, userId)`.                             |
| Per UTC month (user USD) | `maxCostUsd` / `maxCostMicroUsdPerUser`                  | Stored internally as integer micro-USD.                              |
| Per UTC month (org USD)  | `maxCostMicroUsdPerOrg` or default `maxCostUsdPerOrg`    | Org aggregate row (`user_id = __org__` in memory; same in Postgres). |

Period boundaries: `[YYYY-MM-01T00:00:00.000Z, first instant of next month)`.

## Stores

- **`createMemoryBudgetStore()`** — in-process reference; implements reservation APIs for tests and single-node apps. Monthly caps are enforced per process; use Kysely for cross-process atomicity.
- **`@kamod-ch/otok-ai/budget/kysely`** — optional peer `kysely` + Postgres (MVP). `migrateAiBudgetSchema(db, "postgres")` is incremental and non-destructive. Tables: `ai_budget_usage`, `ai_budget_reservations`.

Custom `AiBudgetStore` implementations without `acquireReservation` / `settleReservation` / `releaseReservation` remain supported (**best-effort** concurrency).

## Client billing

`AiClient` calls `check` before each round, then:

- **Reservation store:** `acquireReservation` before the provider call, `settleReservation` with actual usage (or `unknownUsage` on abort/timeout without usage), `releaseReservation` when no usage was reported.
- **Legacy store:** `record` after each round with provider usage.

Unknown provider usage is never settled as zero cost; the hold is released and `unknownUsage` avoids fake free billing.

## Operations

- **Crash / lease expiry:** reservations with `expires_at < now` and `status = held` release reserved headroom (lazy sweep on store access).
- **Idempotency:** duplicate `requestId` on acquire returns existing hold; duplicate settle is a no-op.
- **Concurrency (Postgres):** user + org usage rows are locked in one transaction during acquire.

## CI

Postgres integration: `OTOK_AI_BUDGET_PG_TEST_URL` with `OTOK_REQUIRE_DATABASE_TESTS=1` (see root CI `database` job).

## Limits of guarantee

Hard monthly USD caps require reservation + observed `estimatedCostUsd` on usage. Providers without bounded completion or missing cost metadata remain **best-effort** for spend accuracy.
