# ADR 0003: Route Middleware

## Status

Accepted.

## Kontext

Applications can already register Hono middleware and routes before SSR through `createOtokApp({ configure })`, or compose `createOtokHandler()` into a custom Hono app. This works for global concerns but route-local auth, headers, and request preconditions are not part of route modules.

Otok should reuse Hono concepts where possible and avoid inventing a general plugin system.

## Entscheidung

Add optional route-level middleware exports to route modules and layout modules:

```ts
import type { OtokMiddleware } from "otok/server";

export const middleware: OtokMiddleware[] = [async (c, next) => {
  if (!c.get("user")) return c.redirect("/login");
  await next();
}];
```

The runtime executes middleware for the matched route before loader/action/render. Layout middleware applies in layout order from root to leaf, then route middleware. Middleware should be compatible with Hono `MiddlewareHandler` where practical, while still allowing Otok to continue with rendering after `next()`.

For Phase 1, middleware is server-only and synchronous with the request. It should not affect the Vite scanner beyond importing layout and route modules, which already happens.

## Alternativen

1. Only document `createOtokApp({ configure })`. This is useful but not route-local and pushes route knowledge into central server files.
2. Add `_middleware.ts` convention files. This may be useful later, but module exports are simpler and reuse the existing scanner.
3. Build an Otok plugin system. This is explicitly out of scope for Phase 1.

## Konsequenzen

- `packages/otok` needs middleware type exports and a small execution pipeline around matched route handling.
- Layout modules become more semantically important; generated route entries already include layout module references.
- Tests must prove order, redirects, short-circuit responses, thrown errors, and compatibility with existing global Hono middleware.

## Kompatibilität

Backward compatible. Existing route and layout modules without `middleware` are unchanged. Existing app-level Hono middleware remains the recommended solution for global behavior.

## Offene Punkte

- Whether to expose a typed context store helper or rely on Hono context variables.
- Exact compatibility target with Hono `MiddlewareHandler` generics.
- Whether middleware can provide data to loaders through `c.set()` only or through a dedicated Otok context field.
