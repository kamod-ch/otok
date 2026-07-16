---
title: Migrate from plain Hono
section: Migration
order: 73
---
# Migrate from plain Hono

If you already have a Hono API or custom server, Otok adds file routes, Preact SSR, islands, and soft navigation without replacing Hono.

## When to use which helper

| Helper | Use when |
| --- | --- |
| `createOtokApp()` | You want defaults for health, static assets, and SSR |
| `createOtokHandler()` | You already own a Hono `app` and need API routes first |

## Keep your API routes

```ts
import { Hono } from "hono";
import { createOtokHandler, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const app = new Hono();

app.route("/api", apiRoutes);

app.get(
  "*",
  createOtokHandler({
    routes,
    notFoundRoute,
    errorRoute,
    manifest: readOtokManifest(import.meta.url),
    clientEntry: "src/client.ts",
    devClientEntry: "/src/client.ts",
  }),
);
```

Or register handlers through `createOtokApp({ configure })`:

```ts
createOtokApp({
  routes,
  configure: (app) => {
    app.route("/api/auth", authRoutes);
  },
});
```

## Move HTML routes into files

1. Create `src/app/routes/`.
2. Export a default Preact page component.
3. Add `loader` / `action` as needed.
4. Point Vite at `@otok/vite-plugin`.

## Middleware

Keep global Hono middleware on the app. Use route `_middleware.ts` for tree-local auth, headers, and preconditions.

## Next steps

- Scaffold with `pnpm create otok my-app --template minimal`
- Read [Middleware](/core-concepts/middleware/)
- Read [Deployment](/guides/deployment/)
