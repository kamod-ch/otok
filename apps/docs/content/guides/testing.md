---
title: Testing
section: Guides
order: 30
---
# Testing

Use `@otok/test` for server-side tests and Playwright for browser behavior.

```ts
import { createTestApp, renderRoute } from "@otok/test";

const app = createTestApp({
  routes: [{ path: "/users/:id", component: ({ params }) => <p>User {params.id}</p> }],
});

const { response, html } = await renderRoute(app, "/users/123");
```

Use Playwright for hydration, soft navigation, progressive forms, focus, and history.

See the repository's `docs/testing.md` for the full test matrix.
