# @kamod-ch/otok-queue

Provider-based job queue for [Otok](https://github.com/kamod-ch/otok) apps.

Typed jobs, retry with backoff, idempotency keys, dead-letter behavior, cron schedules, and a clear runtime capability model.

## Install

```bash
pnpm add @kamod-ch/otok-queue
```

## Plugin

```ts
import { defineConfig } from "otok";
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

await queue.enqueue("send-email", { to: "user@example.com", subject: "Hello" }, {
  idempotencyKey: "welcome-user-123",
});

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

| Provider | Config | Capabilities |
|----------|--------|--------------|
| `memory` | `{ type: "memory" }` | Delayed jobs, cron, idempotency, dead letter (non-persistent) |
| `test` | `{ type: "test" }` | Same as memory — for unit/integration tests |

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

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-queue` | Plugin factory, `getQueueClient`, types |
| `@kamod-ch/otok-queue/providers/memory` | In-memory provider factory |
