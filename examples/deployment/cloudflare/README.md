# Cloudflare Workers Deployment

Standalone Otok app for Cloudflare Workers using `createOtokWorkerApp()` and Workers Assets.

## What it demonstrates

- Edge-safe SSR with `createOtokWorkerApp()` (no Node `staticDir` / `fs` manifest read)
- Injected Vite client manifest via JSON import + `resolveOtokManifest()`
- Opt-in `streaming: true`
- Hashed client assets from Workers Assets
- One island page (`/`) and one zero-JS page (`/about`)
- `/api/health` health check

## Prerequisites

- Node.js 20+
- Cloudflare account only required for real `wrangler deploy` (dry-run works offline)

## Setup

From this directory (after packing local Otok packages, or with published versions):

```bash
pnpm install
# or: npm install
```

Link local workspace packages during monorepo development:

```bash
# from otok repo root
pnpm -r --filter './packages/*' build
cd examples/deployment/cloudflare
pnpm add otok@file:../../../packages/otok @otok/vite-plugin@file:../../../packages/vite-plugin-otok
```

## Build and dry-run

```bash
pnpm run smoke
# equivalent to: pnpm run build && wrangler deploy --dry-run
```

## Local preview

```bash
pnpm run build
pnpm run preview   # wrangler dev
```

Open `http://127.0.0.1:8787/` and check:

```bash
curl http://127.0.0.1:8787/api/health
```

## Deploy

```bash
pnpm run deploy
```

## Notes

- Do **not** pass `staticDir` to `createOtokApp` on Workers — use Workers Assets (or R2/CDN) instead.
- `readOtokManifest()` uses Node `fs` and must not run in the Worker. Import `dist/client/.vite/manifest.json` and pass it through `resolveOtokManifest()`.
- Soft navigation and islands behave the same as on Node.
- See `apps/docs/content/guides/deployment.md` for the full guide.
