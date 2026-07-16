# Cloudflare Workers Deployment (Phase 2)

Otok's `createOtokHandler()` and `createOtokWorkerApp()` are Edge-friendly: they use the Fetch API and do not require Node filesystem APIs when `staticDir` is omitted.

Serve hashed client assets from Cloudflare Pages, R2, or a CDN. Point `base` / asset URLs at that origin.

## Minimal worker entry

```ts
import { createOtokWorkerApp, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const app = createOtokWorkerApp({
  routes,
  notFoundRoute,
  errorRoute,
  // Prefer bundling the Vite client manifest into the worker, or fetch it from KV/R2.
  clientEntry: "src/client.ts",
  health: { ok: true, runtime: "cloudflare" },
  streaming: true,
});

export default {
  fetch: app.fetch,
};
```

## Notes

- Install `@hono/node-server` only for Node deployments that use `staticDir`.
- Soft navigation and islands work the same as on Node.
- See `docs/deployment/node.md` for the Phase 1 reference path.
