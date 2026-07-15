---
title: Auth, CRUD, Styling, and Uploads
section: Guides
order: 32
---
# Auth, CRUD, Styling, and Uploads

## Authentication Pattern

Use Hono middleware or route `_middleware.ts` files. Store request-scoped values with `c.set()` and read them in loaders or actions with `c.get()`.

## CRUD Application

Use loaders for reads and actions for create, update, and delete. Browser forms only support GET and POST, so use `_method` for PUT, PATCH, or DELETE.

## File Uploads

Actions receive the raw `Request` and parsed `formData` for form requests. Multipart uploads are not blocked by Otok.

## Styling

Otok core does not depend on Tailwind, Kamod UI, or any CSS framework. Use plain CSS, Tailwind, CSS modules, Kamod UI, or another UI system at the app layer.

## Using Kamod UI

Kamod UI works well in applications and the playground, but it is intentionally not an Otok core dependency.
