---
title: Route Middleware
section: Core Concepts
order: 13
---
# Route Middleware

Use `_middleware.ts` files to colocate Hono-compatible middleware with routes.

```ts
import { defineMiddleware, redirect } from "otok/server";

export default defineMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) redirect("/login", 303);
  await next();
});
```

Middleware runs from parent to child and applies to loaders, actions, and rendering.

```text
src/app/routes/_middleware.ts
src/app/routes/admin/_middleware.ts
src/app/routes/admin/index.tsx
```

Global API routes registered through `createOtokApp({ configure })` remain normal Hono routes.
