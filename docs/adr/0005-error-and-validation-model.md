# ADR 0005: Error and Validation Model

## Status

Accepted.

## Kontext

Otok currently exposes `redirect`, `notFound`, `fail`, `OtokHttpError`, and `isOtokHttpError`. Loaders can throw those helpers. Redirects become redirect responses. Intentional HTTP errors can render `_error.tsx`; unexpected errors hide raw messages unless `exposeErrorDetails` is enabled.

Route actions and forms need a consistent model for redirects, validation failures, status codes, raw responses, and safe error details.

## Entscheidung

Define one shared response normalization layer for loaders, actions, and future middleware short-circuits.

Public helpers should remain small and web-standard:

```ts
redirect(location, 303);
notFound("Document not found");
fail("Forbidden", 403);
validationError({ fieldErrors: { email: "Invalid email" } }, 400);
```

`validationError` should not depend on a schema library. It returns or throws a serializable Otok validation result with:

- `ok: false`;
- HTTP status, default `400`;
- optional `message`;
- `fieldErrors: Record<string, string | string[]>`;
- `formErrors: string[]`;
- optional serializable `values` for safe redisplay.

Unexpected exceptions must continue to hide details by default. Intentional validation and fail messages may be shown to the route because application code created them deliberately.

## Alternativen

1. Use Hono exceptions directly everywhere. This would couple public Otok route APIs to Hono details and does not cover validation state.
2. Pick a validation library. This violates the dependency constraints and would age poorly.
3. Treat validation as plain loader data only. This leaves status codes and progressive form behavior inconsistent.

## Konsequenzen

- `packages/otok` needs shared result types and normalization tests before actions are implemented.
- Error-route props should be documented as intentionally limited.
- Action result shape and page props must be designed together to avoid later breaking changes.

## Kompatibilität

Backward compatible if existing helpers keep signatures and behavior. New validation helpers are additive. Security default of hiding unexpected error details remains unchanged.

## Offene Punkte

- Whether `validationError` throws like `fail` or returns an object by default.
- Exact prop name for action data on page components, for example `action`, `form`, or `result`.
- Whether validation results should set `Cache-Control: no-store` by default.
