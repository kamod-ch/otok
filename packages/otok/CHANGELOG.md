# otok

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
