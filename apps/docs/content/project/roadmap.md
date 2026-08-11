---
title: Project Roadmap
section: Project
order: 90
---
# Project Roadmap

## Phase 1 (complete in 0.2.0–0.3.x)

Delivered:

- shared response and validation semantics (`redirect`, `notFound`, `fail`, `validationError`)
- route actions and progressive forms
- route middleware
- typed route builder
- `@kamod-ch/otok-test` utilities including `parseHtml`
- browser E2E matrix for the playground
- Node deployment guides and smoke tests
- documentation site
- Changesets release automation
- in-repo reference projects under `examples/`

## Phase 1 hardening (done)

- multi-browser Playwright coverage (Chromium, Firefox, WebKit)
- playground independence from local Kamod UI `file:` paths
- deeper migration guides (Fresh, Remix, Hono)
- reference examples CI via `pnpm check:examples`
- docs / ADR sync for shipped Phase 1 APIs

## Phase 2

Shipped:

- Edge / Worker runtime via `createOtokWorkerApp()` and `examples/deployment/cloudflare`
- opt-in streaming SSR (`streaming: true`)
- deferred data / loading boundaries (`createDeferredSlot`, `DeferredBoundary`) with sequential HTML streaming
- Edge-safe manifest injection via `resolveOtokManifest()`
- i18n patterns guide (optional `[[lang]]` route segments; no core i18n runtime)

Still deferred:

- Broader Edge support notes for native Node addons (prefer Web Crypto password helpers on Workers)
- Generic OIDC / Better Auth adapters

Otok avoids premature abstractions such as a general plugin system until real applications prove the need.

## Release Policy

Otok uses Changesets. User-visible package changes should include a changeset. Releases must pass checks, E2E, and pack dry runs.

## Contributing

Keep the core small, prefer Web standards, and avoid adding framework dependencies for UI, validation, databases, or auth.
