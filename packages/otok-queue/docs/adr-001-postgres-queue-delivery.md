# ADR 001: PostgreSQL queue delivery semantics

## Status

Accepted (Prompt 07).

## Context

Otok Queue needs a durable provider and a standalone Node worker. HTTP action idempotency (Prompt 03) is a separate contract from **job enqueue deduplication**.

## Decision

### Delivery guarantee

- **At-least-once** execution: a claimed job may run more than once after worker crash, lease expiry, or DB disconnect.
- **No exactly-once** promise across crashes. Handlers must be **idempotent** (business keys, upserts, outbox patterns).
- **Exclusive claims** while a valid lease is held: only the holder of the current `lease_token` may `complete`, `fail`, or `heartbeat`.

### Schema (PostgreSQL)

- `otok_queue_jobs` — payload, status, `available_at`, attempts, lease columns, scoped dedupe key.
- `otok_queue_dead_letter` — terminal failures with retention metadata.
- `otok_queue_cron_dedupe` — `(schedule_name, fire_at_utc)` primary key for cron tick deduplication.

HTTP idempotency uses **`otok_idempotency_records`** (separate table, separate TTL/scope rules).

### Claim procedure

1. Short transaction: select candidate rows `FOR UPDATE SKIP LOCKED`, assign `processing`, increment `attempts`, set `lease_owner`, `lease_token`, `lease_until`.
2. Commit; execute handler **outside** the transaction.
3. Worker sends **heartbeat** to extend `lease_until` while running.
4. `complete` / `fail` require matching `lease_token`; zero rows updated ⇒ lease lost (no overwrite).

### Retry & dead letter

- Backoff: exponential cap with **bounded jitter** (`computeBackoffWithJitter`).
- `maxAttempts` from enqueue options / plugin defaults.
- Non-retryable errors or exhausted attempts → dead letter row; job row removed or marked dead.
- Manual retry API re-enqueues from dead letter (new job id, fresh lease).

### Cron

- UTC is the first supported timezone (`timezone` field reserved; matcher uses UTC fields today).
- Missed ticks: on worker start, optional catch-up is **not** full cron compatibility — only dedupe prevents double enqueue for the same `(schedule, minute bucket)`.
- Documented subset: five-field patterns as in `cronMatches` (not full vixie cron).

### Lease loss

- Workers must abort in-flight work when heartbeat/complete returns lease lost (AbortSignal wired in worker).
- Expired leases: any worker may reclaim via claim (status returns to claimable pending path via lease expiry reset).

## Consequences

- Operators run web and worker processes separately; both need DB credentials via config/env.
- Integration tests require PostgreSQL; memory provider remains for unit/dev only.
