# ADR 0004: Typed Routes

## Status

Proposed for Phase 1.

## Kontext

The Vite plugin scans route files and generates `virtual:otok-routes` with `routes`, special routes, and `routePaths`. Ambient types currently expose `routePaths: readonly string[]` and `OtokRoutePath`. A previous generated TypeScript-only literal tuple caused SSR parse failures in Vite/Rolldown virtual modules, so runtime virtual modules must stay valid JavaScript.

Phase 1 needs a typed route builder without reintroducing TypeScript syntax into runtime virtual modules.

## Entscheidung

Keep `virtual:otok-routes` runtime JavaScript-only. Add type information either through a type-only virtual module or generated declaration content that Vite/TypeScript can consume without affecting SSR runtime parsing.

Proposed public API:

```ts
import { href } from "virtual:otok-routes";

href("/users/:id", { id: "alice" });
href("/docs/:slug*", { slug: ["routing", "catch-all"] });
```

The builder should:

- accept only known route paths when TypeScript has generated route metadata;
- require dynamic params and catch-all params;
- preserve query and hash through optional options;
- encode path segments safely;
- expose a runtime fallback that validates missing params in development and produces a string in production.

## Alternativen

1. Re-add `as const` to the runtime virtual module. This breaks SSR parsing and is rejected.
2. Generate physical source files in the app. This improves editor types but adds file churn and cleanup problems.
3. Provide only an untyped `path()` helper in `otok/shared`. This is safe but misses the main value of typed routes.

## Konsequenzen

- `packages/vite-plugin-otok` owns route metadata generation and route builder runtime emission.
- `packages/otok` may export generic route-builder types but should not know app route paths.
- `client.d.ts` must remain a safe ambient fallback for consumers outside Vite.
- Tests must cover both emitted JavaScript and type-level behavior, likely with `tsc --noEmit` fixtures.

## Kompatibilität

Backward compatible if existing `routePaths`, `routes`, `notFoundRoute`, and `errorRoute` exports remain. `OtokRoutePath` may stay as a broad ambient fallback and become narrower only in generated type contexts.

## Offene Punkte

- Best mechanism for per-app literal types without TypeScript syntax in runtime virtual modules.
- Whether the public helper should be named `href`, `route`, `path`, or `url`.
- Whether query values support arrays in Phase 1.
