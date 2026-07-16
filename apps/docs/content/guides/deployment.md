---
title: Node and Docker Deployment
section: Guides
order: 31
---
# Node and Docker Deployment

Node.js 20+ is the Phase 1 reference runtime.

```bash
pnpm build
NODE_ENV=production PORT=3000 HOST=0.0.0.0 pnpm start
```

The default server supports `PORT`, `HOST`, and graceful shutdown on `SIGTERM` and `SIGINT`.

Static assets are served with immutable cache headers by default when `staticDir` is configured.

## Streaming SSR (opt-in)

```ts
createOtokHandler({
  routes,
  streaming: true,
});
```

When `streaming` is enabled, Otok flushes the HTML shell (`<!doctype>`, head, stylesheets) before the body and client script. Body rendering stays island-safe so SSR markers remain correct. Default remains buffered HTML.

## Cloudflare Workers (Phase 2)

Use `createOtokWorkerApp()` and serve client assets from Pages/R2/CDN:

```text
examples/deployment/cloudflare/
```

Do not pass `staticDir` on Workers — it requires `@hono/node-server`.

## Docker

Docker examples live in:

```text
examples/deployment/node/
```

Run the smoke test:

```bash
pnpm smoke:node
```
