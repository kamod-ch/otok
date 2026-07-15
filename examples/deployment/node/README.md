# Otok Node Deployment Example

This example builds and runs the playground as a production Node.js application.

## Build and run

```bash
docker compose -f examples/deployment/node/compose.yaml up --build
```

Then open:

```text
http://localhost:3000/
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## What this demonstrates

- Node.js 22 runtime compatible with Otok's Node 20+ requirement
- pnpm via Corepack
- separate package builds for `otok`, `@otok/vite-plugin`, and the playground
- Vite client manifest and hashed assets
- production server start via `node dist/server/server.js`
- `PORT`, `HOST`, and `NODE_ENV`
- Docker healthcheck against `/api/health`

This is a reference example, not a requirement for all Otok deployments. You can deploy the same build output to any Node-capable platform.
