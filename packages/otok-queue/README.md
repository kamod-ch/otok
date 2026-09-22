# @kamod-ch/otok-queue

Provider-based job queue for [Otok](https://github.com/kamod-ch/otok) apps.

Typed jobs, retry with backoff, idempotency keys, dead-letter behavior, cron schedules, and a clear runtime capability model.

## Install

```bash
pnpm add @kamod-ch/otok-queue
```

## Plugin

```ts
import { defineConfig } from "@kamod-ch/otok";
import queue from "@kamod-ch/otok-queue";

type Jobs = {
  "send-email": { to: string; subject: string };
  "sync-billing": { workspaceId: string };
};

export default defineConfig({
  plugins: [
    queue<Jobs>({
      provider: { type: "memory" },
      cron: [{ name: "hourly-sync", cron: "0 * * * *", jobName: "sync-billing", payload: { workspaceId: "all" } }],
    }),
  ],
});
```

## Enqueue and process

```ts
import { getQueueClient } from "@kamod-ch/otok-queue";

const queue = getQueueClient<Jobs>();

await queue.enqueue(
  "send-email",
  { to: "user@example.com", subject: "Hello" },
  {
    idempotencyKey: "welcome-user-123",
  },
);

const result = await queue.process({
  "send-email": async (payload) => {
    // send mail
  },
  "sync-billing": async (payload) => {
    // sync state
  },
});
```

## Providers

| Provider   | Config                                                         | Capabilities                                                  |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `memory`   | `{ type: "memory" }`                                           | Delayed jobs, cron, idempotency, dead letter (non-persistent) |
| `test`     | `{ type: "test" }`                                             | Same as memory — for unit/integration tests                   |
| `postgres` | `createPostgresQueueProvider(db, { type: "postgres", retry })` | Durable jobs, leases, cron dedupe (see ADR)                   |

Production delivery is **at-least-once** with lease tokens and idempotent handlers — not exactly-once. See [`docs/adr-001-postgres-queue-delivery.md`](./docs/adr-001-postgres-queue-delivery.md).

### PostgreSQL setup

1. Run migrations: `migratePostgresQueueSchema(db)` from `@kamod-ch/otok-queue/providers/postgres`.
2. Run a worker: `runQueueWorker` from `@kamod-ch/otok-queue/worker` with the same `DATABASE_URL`.
3. Local stack: [`examples/queue-postgres`](../../examples/queue-postgres) (Postgres on host port **54329**).

Integration tests (real Postgres only):

```bash
OTOK_QUEUE_PG_TEST_URL=postgres://otok:otok@127.0.0.1:54329/otok_queue pnpm --filter @kamod-ch/otok-queue test
```

HTTP action idempotency uses `PostgresIdempotencyStore` from `@kamod-ch/otok` (same DB, separate table and TTL — not job idempotency keys).

## Runtime capabilities

Each provider exposes `capabilities`:

- `delayedJobs` — schedule jobs for later
- `cronJobs` — recurring schedules
- `idempotency` — deduplicate by key
- `deadLetter` — failed jobs move to dead letter after max attempts
- `persistence` — survives process restarts (false for memory/test)

## Retry and dead letter

Retryable errors (`OtokQueueJobError` with `retryable: true`) are re-queued with exponential backoff until `maxAttempts`. Non-retryable errors go straight to dead letter.

## Exports

| Subpath                                   | Purpose                                 |
| ----------------------------------------- | --------------------------------------- |
| `@kamod-ch/otok-queue`                    | Plugin factory, `getQueueClient`, types |
| `@kamod-ch/otok-queue/providers/memory`   | In-memory provider factory              |
| `@kamod-ch/otok-queue/providers/postgres` | Kysely provider, migrations             |
| `@kamod-ch/otok-queue/worker`             | Polling worker + health endpoints       |
