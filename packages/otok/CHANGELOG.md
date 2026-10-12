# otok

## 2.1.0

### Minor Changes

- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Return HTTP 400 for malformed route parameter percent-encoding during matching instead of an unhandled URIError.
- 3a98f5e: Await view transition updateCallbackDone so async DOM updates finish before treating animation aborts as success.
- 00aac39: Harden action idempotency with scoped storage keys, payload fingerprints, 409 conflicts, pending/completed/error states, bounded memory store, and safe response replay (no Set-Cookie). Memory store remains process-local only.
- 00aac39: Fix HTML server cache isolation: versioned cache keys (route id, URL, query, verified scope, Vary), skip shared cache for personalized requests without scope, honor noStore/Set-Cookie/errors, drop unsupported in-process SWR stale serves, and bound the memory provider.
- 00aac39: Stabilize island hydration during soft navigation: unmount replaced hydrated roots, decouple navigation completion from deferred strategies, invalidate stale async imports, and run DOM swaps inside view transitions (respecting reduced motion).
- 00aac39: Add PostgreSQL queue provider with lease-based claiming, worker runtime, cron dedupe, and `PostgresIdempotencyStore` for durable HTTP idempotency. Document at-least-once delivery in ADR-001.
- 00aac39: Fix progressive form soft-nav: distinguish submit outcomes, render 400/422 HTML without native resubmit, preserve submitter/encoding, stale-response guards, loading/error UI, and stable idempotency keys for retries.
- 00aac39: Add API export snapshot baseline, strict budget gates, pack-consumer verification, reproducible build check, release-check orchestration, and gate self-tests.
- 00aac39: Harden soft navigation prefetch with TTL, redirect-aware cache entries, Cache-Control guards, scope invalidation, in-flight deduplication, and mutation-triggered cache clears.
- Updated dependencies
  - @kamod-ch/otok-config@2.1.0

## 0.6.1

### Patch Changes

- 8380ef2: Publish the Otok core runtime as `@kamod-ch/otok` because npm blocks the unscoped `otok` package name. Update generated route types, Vite plugin declarations, and scaffold templates to import the scoped core package.

## 0.6.0

### Minor Changes

- 620dce6: Rename the unavailable `@otok/*` npm scope to `@kamod-ch/otok-*` so packages can publish under the kamod-ch organization (e.g. `@otok/vite-plugin` → `@kamod-ch/otok-vite-plugin`).

### Patch Changes

- Updated dependencies [620dce6]
  - @kamod-ch/otok-config@0.3.0

## 0.4.0

### Minor Changes

- 2e24c99: Add `resolveOtokManifest()` for Edge/Workers, keep `readOtokManifest()` Node-only, harden `createOtokApp` against static `node:module` imports, and ship a standalone Cloudflare Workers example with `pnpm smoke:cloudflare`.
- 15b45d9: Wire deferred data and loading boundaries into SSR: `createDeferredSlot` + `DeferredBoundary` stream critical HTML before slow loader regions resolve (sequential zero-JS HTML), with buffered fallback when streaming is off.
- Implement Redis/Edge KV cache providers with adapter wiring, plugin render hooks and programmatic routes (ADR 0007), flash/validate/validation plugin wrappers, Microsoft/GitLab OAuth, Web Crypto password helpers, first-class `[[lang]]`/`[[locale]]` scanner metadata, deferred E2E coverage, and expanded examples CI.

### Patch Changes

- Updated dependencies
  - @kamod-ch/otok-config@0.2.0

## 0.3.0

### Minor Changes

- e853eb5: Harden Node production deployment with asset cache headers, HOST/graceful shutdown template support, deployment docs, Docker examples, and a production smoke test.
- 019e3fa: Add `_middleware.ts` route middleware scanning and Hono-compatible middleware execution for Otok loaders, actions, and rendering.
- Complete Phase 1 hardening and Phase 2 foundations: validationError helper, parseHtml testing utilities, Edge-safe createOtokWorkerApp, opt-in streaming SSR shells, CSRF recipes, examples CI, multi-browser Playwright, and docs sync.
- 5bef6c4: Add route actions with `actionData`, form method override support, opt-in progressive form submissions through soft navigation, and a route-level `client = true` escape hatch for no-island enhanced routes.
- 84363c3: Add shared response helpers for loaders and future actions, including `json()`, validation-style `fail(status, failure)`, native `Response` passthrough, and `isOtokResponse()`.

### Patch Changes

- Add `@kamod-ch/otok-auth` for cookie sessions, CSRF, and route/API auth middleware. Preserve Set-Cookie headers set during Otok middleware and actions when returning SSR or redirect responses.
- f323daa: Add release automation metadata, package READMEs, and publishability checks for the Otok packages.
