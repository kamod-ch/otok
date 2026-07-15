# @otok/test

Small server-side testing utilities for Otok applications.

`@otok/test` uses Otok's real server handler and Hono's `app.request()` API. It does not start Vite, does not launch a browser, and does not implement a second router.

## Install

```bash
pnpm add -D @otok/test vitest
```

## Basic usage

```ts
import { createTestApp, renderRoute } from "@otok/test";

const app = createTestApp({
  routes: [
    {
      path: "/users/:id",
      component: ({ params }) => <p>User {params.id}</p>,
      loader: ({ params }) => ({ userId: params.id }),
    },
  ],
});

const { response, html } = await renderRoute(app, "/users/123");
expect(response.status).toBe(200);
expect(html).toContain("User 123");
```

## Actions and forms

```ts
const response = await app.request("/projects", {
  method: "POST",
  body: new URLSearchParams({ name: "Otok" }),
});
```

## API

### `createTestApp(options)`

Creates a Hono app with `createOtokApp()` using real Otok routes. `routes`, `notFoundRoute`, and `errorRoute` may be real `OtokRoute` objects or test route inputs.

### `createTestRoute(input)`

Creates a small route manifest fixture from a route path such as `/`, `/users/:id`, or `/docs/:slug*`. This avoids running the Vite plugin in unit tests while still using Otok's real request handler and router.

### `requestRoute(appOrOptions, path, init?)`

Calls Hono `app.request()` and returns the `Response`.

### `renderRoute(appOrOptions, path, init?)`

Calls `requestRoute()` and returns:

```ts
{
  response: Response;
  html: string;
}
```

## Scope

Use `@otok/test` for server-side tests of:

- loaders
- actions
- route params
- middleware
- redirects
- expected failures
- not-found and error routes
- SSR HTML
- headers and cookies

Use Playwright or another browser runner for client behavior such as hydration, soft navigation, and progressive form enhancement.
