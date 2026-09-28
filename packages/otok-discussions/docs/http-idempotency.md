# HTTP idempotency boundaries

Otok actions use `@kamod-ch/otok/server` idempotency when `_idempotency` (form) or `x-otok-idempotency-key` (fetch) is present.

## Scope

Storage keys include **route id**, **HTTP method**, and **verified cache scope** (`userId`, `tenantId`) from middleware — not client-supplied tenant headers.

Authentication must be resolved before the action body runs on the **first** request; replays return the stored response for the same user/tenant/key/fingerprint.

## Recommended idempotency keys (HTML forms)

| Intent   | Stable key suggestion   | Notes                                      |
| -------- | ----------------------- | ------------------------------------------ |
| comment  | `comment-create`        | Same key + body → replay 303 or 422        |
| reply    | `reply-create`          | Include parent in form body fingerprint    |
| edit     | `comment-edit:{id}`     | Fingerprint includes `bodyMarkdown`        |
| delete   | `comment-delete:{id}`   |                                            |
| report   | `report:{targetId}`     | Domain dedupe + idempotency                  |
| react    | optional                | Service enforces one active reaction/actor |

## Natural idempotence (no Exactly-once claim)

- **Reaction set** to the same emoji → `CONFLICT` (already set); changing emoji replaces prior reaction.
- **Counters** (reply counts) — at-least-once under crash/retry; adapter transactions prevent lost updates in normal operation.
- **Moderation decisions** — not idempotent at HTTP layer; repeat approve is a no-op only if domain allows transition.

422 validation responses **are stored** when idempotency is enabled, so a double submit after validation does not re-run the mutation.
