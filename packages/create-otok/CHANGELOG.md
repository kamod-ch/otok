# create-otok

## 0.3.0

### Patch Changes

- e853eb5: Harden Node production deployment with asset cache headers, HOST/graceful shutdown template support, deployment docs, Docker examples, and a production smoke test.
- 019e3fa: Add `_middleware.ts` route middleware scanning and Hono-compatible middleware execution for Otok loaders, actions, and rendering.
- Complete Phase 1 hardening and Phase 2 foundations: validationError helper, parseHtml testing utilities, Edge-safe createOtokWorkerApp, opt-in streaming SSR shells, CSRF recipes, examples CI, multi-browser Playwright, and docs sync.
- 5bef6c4: Add route actions with `actionData`, form method override support, opt-in progressive form submissions through soft navigation, and a route-level `client = true` escape hatch for no-island enhanced routes.
- f323daa: Add release automation metadata, package READMEs, and publishability checks for the Otok packages.
- 5a3751f: Add a typed `route()` URL builder to `virtual:otok-routes`, generated route file patterns, and runtime URL encoding for dynamic, catch-all, optional, grouped, query, and hash routes.
