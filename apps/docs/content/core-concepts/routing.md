---
title: File-based Routing
section: Core Concepts
order: 11
---
# File-based Routing

Routes live in `src/app/routes`.

```text
index.tsx              /
about.tsx              /about
users/[id].tsx         /users/:id
docs/[...slug].tsx     /docs/:slug*
[[lang]]/about.tsx     /about and /:lang/about
(marketing)/about.tsx  /about
```

Special files:

```text
_layout.tsx       shared layout
_middleware.ts    route middleware
_not-found.tsx    404 route
_error.tsx        expected and unexpected error route
```

Files starting with `$` are colocated islands and are not page routes.
