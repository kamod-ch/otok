# Otok Examples

This directory contains deployment samples and reference applications.

## Deployment

- `deployment/node` — Docker and Compose setup for an Otok Node deployment.
- `deployment/cloudflare` — standalone Workers app using `createOtokWorkerApp()`, Workers Assets, streaming SSR, and `resolveOtokManifest()` (validated by `pnpm smoke:cloudflare`).

## Reference applications

- `reference-ai-audit` — AI-assisted repository audit workflow with route actions, progressive forms, API routes, not-found handling, and an island for finding triage.
- `reference-flat-cms` — flat-file style CMS with public pages, admin middleware, create/update/delete actions, method override, and a live-preview island.
- `i18n-trilingual` — DE / EN / FR demo with `@kamod-ch/otok-i18n` plugin, islands, locale switcher, hreflang, and sitemap.
- `typed-routes` — typed `defineLoader` / route typegen demo.
- `auth-github` — GitHub OAuth + session demo.

The reference and deployment apps are intentionally kept outside `pnpm-workspace.yaml` so they remain copyable starter projects and do not add app dependencies to Otok core.

CI validates reference apps with `pnpm check:examples` (including typed-routes, i18n-trilingual, and auth-github) and the Cloudflare example with `pnpm smoke:cloudflare` (pack local packages, typecheck, build, `wrangler deploy --dry-run`).
