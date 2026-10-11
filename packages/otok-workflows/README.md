# @kamod-ch/otok-workflows

Durable multi-step workflows for Otok — typed steps, lease-based workers, retries, and Kysely persistence.

## Example

```ts
export const enrichCompany = defineWorkflow({
  name: "company.enrich",
  version: 1,
  input: companyInputSchema,
  run: async ({ input, step, instanceId }) => {
    const website = await step.run("find-website", () => findWebsite(input));
    const contacts = await step.run(
      "charge-enrichment",
      () =>
        billing.charge(input.companyId, {
          idempotencyKey: `${instanceId}:charge-enrichment`,
        }),
      { idempotencyKey: `${instanceId}:charge-enrichment` },
    );
    return { website, contacts };
  },
});
```

Completed steps are **replayed from the store** after crash — handlers for those steps are not called again. See [`docs/durability.md`](./docs/durability.md) for at-least-once semantics and the side-effect gap.

## Plugin

```ts
import workflows from "@kamod-ch/otok-workflows/plugin";

plugins: [
  workflows({
    workflows: { enrichCompany },
    processIntervalMs: 2_000, // processRunnable + tickCron (UTC)
    cron: [{ workflowName: "company.enrich", cron: "0 * * * *" }],
  }),
];
```

Cron: **UTC minute buckets**, deduplicated per schedule; not full cron compatibility; missed minutes while offline are not backfilled.

## API

```ts
const instance = await workflows.start(enrichCompany, input, { idempotencyKey: "import-acme" });
await workflows.resume(instance.id);
await workflows.cancel(instance.id);
const status = await workflows.status(instance.id);
```

## Workers

Use `engine.processRunnable()` on an interval (or a dedicated worker process) with a **persistent store**. Claims are atomic with leases — same model as `@kamod-ch/otok-queue`.

## Providers

| Provider | Use case                                                                    |
| -------- | --------------------------------------------------------------------------- |
| `memory` | Development and unit tests                                                  |
| `kysely` | SQLite / PostgreSQL (`createKyselyWorkflowStore`, `migrateWorkflowsSchema`) |

## Leases

Claimed runs (`execute(id, { leaseToken })`) renew the lease on an interval and fence instance/step writes with `updateInstanceIfHeld` / `saveStepIfHeld`. Losing the lease yields `LEASE_LOST` instead of stale completion. Direct `execute` without a token is rejected while another worker holds an active lease.

Postgres integration: `OTOK_WORKFLOWS_PG_TEST_URL` (see CI database job). With `OTOK_REQUIRE_DATABASE_TESTS=1`, a missing URL fails fast.

## Guarantees (tested)

- Step output replay after restart (memory + SQLite Kysely)
- Exclusive `claimRunnable` with lease release and token-fenced writes after reclaim
- `runAttempts` on the instance for workflow-level retries
- Pause / cancel via DB visible across engine instances
- Cron dedupe (same UTC minute)
- Definition `version` mismatch → `VERSION_MISMATCH` / `dead`
- Background `autoExecute` errors surfaced via `onExecutionError`

Not guaranteed: exactly-once side effects inside a step without your own idempotency keys.
