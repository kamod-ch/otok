# Workflow durability guarantees

## Delivery

Workflow execution is **at-least-once** at the instance level when using `processRunnable()` with a persistent store. Workers claim instances with a **lease** (`lease_owner`, `lease_token`, `lease_until`). After lease expiry, another worker may reclaim and continue from **persisted step outputs**.

There is **no exactly-once** guarantee for side effects inside a step body.

## Step replay

Completed steps are stored by `(instanceId, stepName)`. On resume, `step.run` returns the stored output and **does not** call the handler again.

## Side-effect gap

If a worker crashes **after** an external side effect (API call, payment, email) but **before** the step result is saved, the step may run again on retry. Mitigate with stable idempotency keys on the external system:

```ts
await step.run(
  "charge-customer",
  () => billing.charge(input.orderId, { idempotencyKey: `${instanceId}:charge-customer` }),
  { idempotencyKey: `${instanceId}:charge-customer` },
);
```

## Workflow-level retries

`runAttempts` on the instance counts **whole workflow executions** that ended in failure. It is **not** derived from the number of failed step rows. Step-level retries use `withRetry` inside a single execution.

## Status transitions (persistent)

| From                      | To                     | How                                   |
| ------------------------- | ---------------------- | ------------------------------------- |
| `pending`                 | `running`              | `start`, `claimRunnable`              |
| `failed`                  | `running`              | `claimRunnable` (after `availableAt`) |
| `running` (expired lease) | `running`              | `claimRunnable` (new lease)           |
| `running`                 | `completed`            | successful `execute`                  |
| `running`                 | `failed` / `dead`      | error in `execute`                    |
| `running`                 | `waiting_approval`     | `waitForApproval`                     |
| `*`                       | `paused` / `cancelled` | API (visible to all workers)          |

Pause and cancel are stored in the DB; step handlers re-read status before running.

## Deploy / version

Each instance stores `workflowVersion` from the definition at start. If the registered definition version changes, resume returns `VERSION_MISMATCH` and the instance moves to `dead` — no silent run under a new step graph.

## Cron

Cron uses **UTC** minute buckets only (`timezone: "UTC"` or unset). Duplicate ticks in the same minute are deduplicated via `workflow_cron_dedupe`. Offline gaps are **not** backfilled. Only a subset of five-field cron expressions is supported (same as `@kamod-ch/otok-queue`).
