# Changelog

## Unreleased

### Added

- `validationError()` helper with flexible field errors and optional form `values`.
- `parseHtml` / `renderParsedRoute` in `@otok/test` for SSR HTML assertions.
- Opt-in `streaming: true` on handlers for shell-first HTML responses.
- `createOtokWorkerApp()` Edge-safe app factory without Node static serving.
- CSRF double-submit recipe in the minimal template and Flat CMS example.
- Typed-route compile fixtures for `@otok/vite-plugin`.
- Reference examples CI via `pnpm check:examples`.
- Multi-browser Playwright projects (Chromium, Firefox, WebKit).
- Migration guides (Fresh, Remix, plain Hono) and i18n pattern guide.
- Cloudflare Workers deployment sketch under `examples/deployment/cloudflare/`.

### Changed

- Playground depends on published `@kamod-ui/core` instead of a local `file:` path.
- `.gitignore` ignores all `**/dist/`, Playwright reports, and test-results.
- Phase 1 ADRs marked Accepted; roadmap docs synchronized with shipped APIs.

## 0.2.0

### Added

- Soft navigation head sync via `data-otok-head` markers (title, meta, canonical, JSON-LD).
- Link prefetch on hover for soft navigation.
- Pending island hydration cancellation before soft-nav DOM swaps.
- Route `chrome` export convention passed to layouts via `OtokLayoutProps`.
- `readOtokManifest()` helper for production client manifests.
- `createOtokApp({ configure })` hook for API routes and middleware.
- `routePaths` / `OtokRoutePath` exports from `virtual:otok-routes`.
- Island id collision warnings in `@otok/vite-plugin`.
- `client-only` island hydration strategy.
- Minimal `create-otok` template (default); `full` template retains the dashboard demo.
- MIT LICENSE, full-stack documentation, and security conventions.

### Changed

- Theme bootstrap is opt-in via `theme: true` on server handlers (disabled by default).
- `@hono/node-server` is now an optional peer dependency of `otok`.
- Soft navigation E2E coverage in the playground.

## 0.1.0

### Breaking Changes

- Island IDs are now build-time stable and based on island filenames. Runtime fallback to `function.name` was removed to avoid production mismatches after minification.
- Route conventions now reserve `_layout.tsx`, `_not-found.tsx`, and `_error.tsx`.
- The default template uses layout routes and imports virtual module types from `@otok/vite-plugin/client`.

### Added

- Layout route convention with nested layout composition.
- Convention-based 404 and error routes.
- `redirect()`, `notFound()`, and `fail()` helpers.
- Catch-all, optional dynamic, and route group support in file routes.
- Hydration strategies for islands: `load`, `idle`, `visible`, and `media`.
- Hybrid island props transport for large JSON payloads.
- Extended `head()` output for links, scripts, and JSON-LD.
- `createOtokApp()` server helper.
- README, conventions documentation, CI workflow, and hardened `create-otok --template` handling.
