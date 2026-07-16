---
title: Migration and Comparison
section: Migration
order: 70
---
# Migration and Comparison

## Otok vs plain Hono

Plain Hono is excellent for HTTP APIs and custom servers. Otok adds file routes, Preact SSR, islands, route actions, soft navigation, and Vite integration while keeping Hono composition.

```ts
import { Hono } from "hono";
import { createOtokHandler, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const app = new Hono();
app.get("/api/health", (c) => c.json({ ok: true }));
app.get("*", createOtokHandler({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
}));
```

Use `createOtokApp()` when you want static assets, health, and SSR defaults; use `createOtokHandler()` when you own the Hono app.

## Otok vs HonoX

HonoX is a broader full-stack framework. Otok intentionally stays smaller and focuses on server-rendered apps with opt-in islands.

## Otok vs Fresh

Fresh popularized islands and progressive enhancement. Otok uses Hono, Preact, Vite, and Node as its Phase 1 reference runtime.

| Fresh concept | Otok equivalent |
| --- | --- |
| `routes/` file routes | `src/app/routes/` |
| Islands | `<Island>` + `src/app/islands/` |
| Handlers | `loader` / `action` exports |
| Deno Deploy | Node first; Edge planned for 1.x |

## Otok vs Astro

Astro is a mature content and island framework. Otok is smaller, Hono-first, and application-server oriented (actions, middleware, forms).

## Otok vs Remix / React Router

Remix-style progressive forms map closely:

| Remix | Otok |
| --- | --- |
| `loader` | `loader` |
| `action` | `action` |
| `Form` | native `<form method="post">` + optional soft nav |
| `useActionData` | `actionData` page prop |
| client router | soft navigation (HTML swap), not SPA routing |

## Upgrade Guide

Read the repository changelog and Changesets for package-level migration notes. TypeScript public types are considered part of the API.

See also the dedicated migration guides for Fresh, Remix, and plain Hono.
