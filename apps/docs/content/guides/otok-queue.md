---
title: Queue Extension
section: Guides
order: 36
---
# @kamod-ch/otok-queue

Typed background jobs with provider abstraction, retry/backoff, idempotency keys, cron, and dead-letter behavior.

## Providers

| Provider | Capabilities |
|----------|--------------|
| `memory` / `test` | Delayed jobs, cron, idempotency, dead letter (non-persistent) |

## Plugin

```ts
import queue from "@kamod-ch/otok-queue";

type Jobs = {
  "send-email": { to: string };
};

export default defineConfig({
  plugins: [queue<Jobs>({ provider: { type: "memory" } })],
});
```

## Process jobs

```ts
import { getQueueClient } from "@kamod-ch/otok-queue";

await getQueueClient<Jobs>().enqueue("send-email", { to: "user@example.com" }, {
  idempotencyKey: "welcome-user-123",
});

await getQueueClient<Jobs>().process({
  "send-email": async ({ to }) => { /* ... */ },
});
```

See [`packages/otok-queue/README.md`](https://github.com/kamod-ch/otok/tree/main/packages/otok-queue).
