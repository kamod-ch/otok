# Otok Examples

This directory contains deployment samples and reference applications.

## Deployment

- `deployment/node` — Docker and Compose setup for an Otok Node deployment.
- `deployment/cloudflare` — Workers entry sketch using `createOtokWorkerApp()` (serve assets from Pages/R2/CDN).

## Reference applications

- `reference-ai-audit` — AI-assisted repository audit workflow with route actions, progressive forms, API routes, not-found handling, and an island for finding triage.
- `reference-flat-cms` — flat-file style CMS with public pages, admin middleware, create/update/delete actions, method override, and a live-preview island.

The reference apps are intentionally kept outside `pnpm-workspace.yaml` so they remain copyable starter projects and do not add app dependencies to Otok core.

CI validates them with `pnpm check:examples`, which packs the local `otok` and `@otok/vite-plugin` packages, installs those tarballs into each example, then runs `typecheck` and `build`.
