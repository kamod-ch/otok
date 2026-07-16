---
title: Auth, CRUD, Styling, and Uploads
section: Guides
order: 32
---
# Auth, CRUD, Styling, and Uploads

## Authentication Pattern

Use Hono middleware or route `_middleware.ts` files. Store request-scoped values with `c.set()` and read them in loaders or actions with `c.get()`.

## CSRF for cookie sessions

Otok does not ship automatic CSRF protection. For cookie-authenticated apps, use a double-submit cookie:

1. Set a readable CSRF cookie on GET requests.
2. Include a matching hidden `_csrf` field in forms.
3. Reject mutating form posts when cookie and field do not match.

The minimal template includes a copy-paste recipe at:

- `src/lib/csrf.ts`
- `src/app/recipes/csrf-middleware.ts`

Wire it as `src/app/routes/_middleware.ts` when you enable cookie sessions:

```ts
export { default } from "../recipes/csrf-middleware";
```

In forms:

```tsx
<input type="hidden" name="_csrf" value={csrfToken} />
```

## CRUD Application

Use loaders for reads and actions for create, update, and delete. Browser forms only support GET and POST, so use `_method` for PUT, PATCH, or DELETE.

## File Uploads

Actions receive the raw `Request` and parsed `formData` for form requests. Multipart uploads are not blocked by Otok.

## Styling

Otok core does not depend on Tailwind, Kamod UI, or any CSS framework. Use plain CSS, Tailwind, CSS modules, Kamod UI, or another UI system at the app layer.

## Using Kamod UI

Kamod UI works well in applications and the playground, but it is intentionally not an Otok core dependency.
