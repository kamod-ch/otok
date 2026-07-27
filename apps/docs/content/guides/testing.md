---
title: Testing
section: Guides
order: 30
---
# Testing

Use `@otok/test` for server-side tests and Playwright for browser behavior.

```ts
import { createOtokTestApp, authenticatedSession } from "@otok/test";

const app = await createOtokTestApp({
  routes: [{ path: "/dashboard", component: ({ params }) => <p>Dashboard</p> }],
  plugins: [],
});

const response = await app.get("/dashboard", { session: authenticatedSession });
expect(response.status).toBe(200);
await app.cleanup();
```

Legacy helpers such as `createTestApp`, `renderRoute`, and `renderParsedRoute` remain available.

```ts
import { createTestApp, renderParsedRoute } from "@otok/test";

const app = createTestApp({
  routes: [{ path: "/users/:id", component: ({ params }) => <p>User {params.id}</p> }],
});

const { document } = await renderParsedRoute(app, "/users/123");
expect(document.getText("p")).toContain("User 123");
```

Use `@otok/test/client` with Vitest's jsdom environment for island hydration and soft-navigation unit tests. Use Playwright for full browser coverage.

See the repository's `docs/testing.md` for the full test matrix.
