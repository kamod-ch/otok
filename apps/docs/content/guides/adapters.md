---
title: Deployment Adapters
section: Guides
order: 32
---
# Deployment Adapters

Otok uses explicit deployment adapters — similar to SvelteKit — configured in `otok.config.ts`:

```ts
import { defineConfig } from "@kamod-ch/otok";
import node from "otok-adapter-node";

export default defineConfig({
  adapter: node({ outDir: "dist" }),
});
```

## Official adapters

| Adapter | Package | Runtime |
| --- | --- | --- |
| Node.js | `otok-adapter-node` | Standalone Hono server |
| Cloudflare | `otok-adapter-cloudflare` | Workers + Workers Assets |
| Static | `otok-adapter-static` | Prerendered HTML |

Each adapter declares **capabilities** (`ssr`, `node-apis`, `prerender`, …). Plugins use `assertAdapterCapability(ctx.adapter, "node-apis", reason)` to fail fast with readable errors when the active runtime cannot support them.

## Node adapter

Generates a production server entry with `@hono/node-server`, serves hashed assets from `dist/client`, and supports graceful shutdown. Configure bind address via `HOST` and `PORT`.

Examples: `examples/adapters/node`, `examples/deployment/node` (Docker).

## Cloudflare adapter

Generates a worker entry using `createOtokWorkerApp()` and `wrangler.toml` with an `[assets]` binding. The worker bundle uses web-standard APIs only.

Example: `examples/adapters/cloudflare`.

## Static adapter

Prerenders static routes at build time and copies client assets into the output directory. Strict mode rejects routes with `loader` or `action` exports.

Example: `examples/adapters/static`.

## Custom adapters

See the repository docs at `docs/adapters/creating-adapters.md`.
