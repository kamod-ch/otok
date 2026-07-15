---
title: Error Handling
section: Core Concepts
order: 15
---
# Error Handling

Otok has one response model for loaders, actions, middleware, and server handlers.

```ts
import { fail, json, notFound, redirect } from "otok/server";

export const loader = ({ params }) => {
  if (!params.id) notFound();
  if (params.id === "latest") redirect("/users/alice");
  if (params.id === "api") return json({ user: "alice" });
  fail(400, { message: "Validation failed" });
};
```

Expected errors can render `_error.tsx` with the intended status. Unexpected exceptions hide internal details by default. Set `exposeErrorDetails: true` only for trusted development environments.
