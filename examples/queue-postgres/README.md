# Queue + PostgreSQL (local)

Demonstrates durable `@kamod-ch/otok-queue` with a separate worker process. No external payment or email providers — handlers are stubs.

## Credentials

Configure via environment only:

- `DATABASE_URL` — PostgreSQL connection string (web and worker)
- `WORKER_HEALTH_PORT` — worker liveness/readiness HTTP port (default `9090`)

## Run

```bash
docker compose -f examples/queue-postgres/docker-compose.yml up --build
```

Apply schema from the app or worker on boot using `migratePostgresQueueSchema` from `@kamod-ch/otok-queue/providers/postgres`.

## Tests

Integration tests (real PostgreSQL):

```bash
export OTOK_QUEUE_PG_TEST_URL=postgres://otok:otok@127.0.0.1:54329/otok_queue
docker compose -f examples/queue-postgres/docker-compose.yml up -d db
pnpm --filter @kamod-ch/otok-queue test
```

See [ADR 001](../../packages/otok-queue/docs/adr-001-postgres-queue-delivery.md) for delivery semantics (at-least-once, lease tokens, idempotent handlers).
