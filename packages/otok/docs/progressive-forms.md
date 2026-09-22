# Progressive forms (soft navigation)

Native HTML forms remain the baseline. With `createOtokClient({ softNav: { forms: true } })`, eligible same-origin `GET`/`POST` forms are submitted via `fetch` and the returned HTML is swapped into `[data-otok-page]`.

## Outcomes

Enhanced submission resolves to one of:

| Kind              | Meaning                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `handled`         | Success HTML applied (including redirects followed by fetch)           |
| `validation`      | `400`/`422` HTML validation UI applied — **no** native resubmit        |
| `native-fallback` | Enhancement skipped **before** send — `requestSubmit(submitter)`       |
| `aborted`         | Aborted after send — show error, **no** resubmit                       |
| `error`           | Network failure after send — show error, **no** resubmit               |
| `ambiguous`       | Non-HTML or unexpected status after send — show error, **no** resubmit |
| `stale`           | Superseded by a newer navigation/submit                                |

`submitSoftNavigationForm()` still returns a boolean (`handled` or `validation` → `true`).

## Idempotency on retry

POST bodies receive a stable `_idempotency` field (and header) stored on the form element. Retries after errors reuse the same key so the server can deduplicate (see `docs/idempotency.md`). Process-local memory does not span workers.

## Supported forms

- Methods: `GET`, `POST` (including `_method` override in body)
- Encodings: `application/x-www-form-urlencoded`, `multipart/form-data`
- Target: `_self` only
- Browser validation via `checkValidity()` — invalid forms stay native

Unsupported cases are left to the browser (no `preventDefault`).

## Side effects vs exactly-once

If the server completes an action but the browser never receives the HTML response, the UI shows an error and does **not** auto-resubmit. The user may retry manually; idempotency keys reduce duplicate mutations but do not guarantee exactly-once external effects.
