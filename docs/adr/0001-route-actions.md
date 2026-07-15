# ADR 0001: Route Actions

## Status

Proposed for Phase 1.

## Kontext

Otok route modules currently support a `default` page component plus optional `loader`, `head`, and `chrome` exports. The server runtime calls loaders for matched routes and then renders HTML. There is no first-class write path for HTML forms, POST requests, validation results, redirects after mutation, or action-specific status handling.

Phase 1 needs progressive, server-first mutations without making islands mandatory and without binding Otok Core to a validation library, database, auth system, Tailwind, or Kamod UI.

## Entscheidung

Add an optional route-module export named `action` handled by `otok/server` for non-GET submissions to the matched route.

Proposed public API:

```ts
import type { OtokAction, OtokActionResult } from "otok/server";

export const action: OtokAction = async ({ request, params, formData, hono }) => {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, status: 400, fieldErrors: { name: "Required" } };
  return redirect("/thanks", 303);
};
```

The runtime should treat `GET` and `HEAD` as render requests and route `POST`, `PUT`, `PATCH`, and `DELETE` to `action` when present. If no action exists, return `405 Method Not Allowed` with an `Allow` header.

Actions return one of:

- a plain serializable result for re-rendering the same route;
- an `OtokActionResult` object with status, form errors, field errors, and optional data;
- a thrown or returned redirect through the shared redirect semantics;
- a raw `Response` for escape hatches.

## Alternativen

1. Use only user-defined Hono routes before SSR. This is already possible but does not integrate with route modules, form re-rendering, or typed action data.
2. Add separate `+action.ts` files. This increases scanner complexity and splits a page's read/write logic before Otok has enough scale to justify it.
3. Make actions client-only through islands. This violates progressive enhancement and zero-JS pages.

## Konsequenzen

- `packages/otok` gains action types, request dispatch, action-result normalization, and tests.
- `packages/vite-plugin-otok` should not need a new virtual module field because route modules are imported as namespaces already; runtime can inspect `route.module.action`.
- Form submissions work without client JavaScript.
- Client enhancements can be added later without changing the server contract.

## Kompatibilität

Backward compatible. Existing route modules without `action` keep current behavior. Existing public helpers `redirect`, `notFound`, and `fail` remain valid.

## Offene Punkte

- Exact shape and naming of `OtokActionResult` versus `ValidationError` helpers.
- Whether action results should be available to `loader`, page props, or both on the re-render.
- How to handle non-form content types beyond `application/x-www-form-urlencoded` and `multipart/form-data` in Phase 1.
