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

Docker examples live in:

```text
examples/deployment/node/
```

Run the smoke test:

```bash
pnpm smoke:node
```
