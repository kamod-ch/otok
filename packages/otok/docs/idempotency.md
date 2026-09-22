# Action idempotency

Otok supports idempotent **actions** via `X-Otok-Idempotency-Key` or the `_idempotency` form field.

## Scope

Storage keys include:

- HTTP method (including `_method` override)
- Route id and route pattern
- Verified **user** (`user` context / cache scope) and/or **tenant** (`setOtokCacheScope`)
- Explicit **anonymous bucket** per route (`anon` or `tenant:{id}`) — never a global namespace and never client IP

The client-supplied idempotency key is only unique **within** that scope.

## Payload fingerprint

The same scope + client key with a **different body** returns **409 Conflict**.

Supported fingerprint inputs:

- `application/x-www-form-urlencoded` and `multipart/form-data` (via parsed `FormData`, files hashed as `name:size:type` only)
- `application/json` (bounded read via cloned request, default max **256 KiB**)
- Empty bodies

Idempotency metadata fields (`_idempotency`, `_method`, `_csrf`) are excluded.

## Store contract

`IdempotencyStore` supports `pending`, `completed`, and `error` records with TTL (default **24 h**). The default `MemoryIdempotencyStore` is **process-local only** — it does not coordinate across Node workers or machines. A PostgreSQL provider is planned separately.

Concurrent requests with the same scope, key, and payload share **one** in-flight execution (wait up to **60 s**).

## Stored responses

- Buffered bodies up to **512 KiB**
- **No** `Set-Cookie` responses stored (replay would be unsafe)
- **5xx** responses are not stored (retries allowed)
- **422** validation responses may be stored for replay
- Replays include `x-otok-idempotency: replay`

## Exactly-once

Otok does **not** guarantee exactly-once side effects. If an action mutates external state and the process crashes **after** the side effect but **before** the store persists the response, clients may retry and the action may run again. Use outbox patterns or external idempotency keys for strong guarantees.

## Middleware order

Authentication and authorization middleware must run **before** the action handler (standard Otok route middleware). Replays return the stored HTTP response only after the original request completed authorization successfully.
