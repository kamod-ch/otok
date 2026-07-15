---
title: Server Rendering
section: Core Concepts
order: 10
---
# Server Rendering

Otok renders Preact pages on the server through Hono. The Vite plugin scans route files and emits `virtual:otok-routes`; `createOtokApp()` or `createOtokHandler()` consumes that manifest.

```ts
import { createOtokApp, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

export default createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  staticDir: "./dist/client",
});
```

Pages that render no islands do not need to ship a client module in production unless the route exports `client = true`.
