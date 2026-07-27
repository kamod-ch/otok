---
title: Node, Docker, and Cloudflare Deployment
section: Guides
order: 31
---
# Node, Docker, and Cloudflare Deployment

Node.js 20+ is the Phase 1 reference runtime. Cloudflare Workers are supported via `createOtokWorkerApp()`.

```bash
pnpm build
NODE_ENV=production PORT=3000 HOST=0.0.0.0 pnpm start
```

The default Node server supports `PORT`, `HOST`, and graceful shutdown on `SIGTERM` and `SIGINT`.

Static assets are served with immutable cache headers by default when `staticDir` is configured.

## Streaming SSR (opt-in)

```ts
createOtokHandler({
  routes,
  streaming: true,
});
```

When `streaming` is enabled, Otok flushes the HTML shell (`<!doctype>`, head, stylesheets) before the body and client script. Body rendering stays island-safe so SSR markers remain correct. Default remains buffered HTML.

## Cloudflare Workers

Use `createOtokWorkerApp()` and serve hashed client assets from Workers Assets (or Pages/R2/CDN).

Reference app:

```text
examples/deployment/cloudflare/
```

### Manifest on Edge

`readOtokManifest()` uses Node `fs` and must **not** run in a Worker. Import the Vite client manifest JSON and pass it through `resolveOtokManifest()`:

```ts
import { createOtokWorkerApp, resolveOtokManifest, type ViteManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import clientManifest from "../dist/client/.vite/manifest.json";

const app = createOtokWorkerApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: resolveOtokManifest(clientManifest as ViteManifest, { prodOnly: false }),
  clientEntry: "src/client.ts",
  health: { ok: true, runtime: "cloudflare" },
  streaming: true,
});

export default app;
```

### Build and smoke

```bash
# from examples/deployment/cloudflare
pnpm install
pnpm run build
pnpm exec wrangler deploy --dry-run

# from the Otok monorepo root
pnpm smoke:cloudflare
```

### Limits

- Do not pass `staticDir` on Workers — it requires `@hono/node-server`.
- Soft navigation and islands work the same as on Node.
- Auth password hashing (`@node-rs/argon2`) and other native Node addons need `nodejs_compat` and are out of scope for the minimal CF example.

## Docker

Docker examples live in:

```text
examples/deployment/node/
```

Run the Node smoke test:

```bash
pnpm smoke:node
```
