# Otok Conventions

This document describes the conventions implemented by the Otok runtime and Vite plugin.

## File-Based Routes

Otok scans `src/app/routes` by default. The Vite plugin turns route files into `virtual:otok-routes`.

```text
index.tsx              /
about.tsx              /about
users/[id].tsx         /users/:id
docs/[...slug].tsx     /docs/:slug*
[[lang]]/about.tsx     /about and /:lang/about
(marketing)/about.tsx  /about
```

Static routes rank above dynamic routes, and catch-all routes rank last. This keeps `/docs/setup` ahead of `/docs/[...slug]` when both exist.

## Route Modules

A route module exports a default Preact component and may export `loader` and `head`.

```tsx
import type { OtokContext } from "otok/server";

export const loader = ({ params }: OtokContext) => ({
  userId: params.id,
});

export const head = ({ data }: { data: { userId: string } }) => ({
  title: `User ${data.userId}`,
});

export default function UserPage({ data }: { data: { userId: string } }) {
  return <p>{data.userId}</p>;
}
```

`loader` receives the Hono context, raw `Request`, route params, and the route pattern.

## Layouts

`_layout.tsx` wraps every page in its directory and child directories.

```tsx
import type { OtokLayoutProps } from "otok/server";

export default function Layout({ children }: OtokLayoutProps) {
  return <main>{children}</main>;
}
```

Nested layouts apply from root to leaf. Layout files are not matched as pages.

## Soft Navigation

Enable partial page updates in `src/client.ts`:

```ts
createOtokClient({ registry: islandModules, softNav: true });
```

The server wraps each page in `data-otok-page`. Mark route-dependent layout regions with `data-otok-swap`:

```tsx
<nav data-otok-swap="sidebar-nav">...</nav>
<header data-otok-swap="topbar">...</header>
```

On internal link clicks Otok fetches HTML, replaces the page region, patches swap regions, hydrates new islands, and updates the URL. Add `data-otok-no-nav` to opt out. Missing page markers fall back to a full reload.

## Special Routes

Two reserved files provide convention-based fallbacks:

```text
_not-found.tsx    Rendered for unmatched routes or `notFound()`
_error.tsx        Rendered for thrown errors and `fail()`
```

Use helpers from `otok/server` or `otok/shared` inside loaders. Loaders can return normal serializable data, a native `Response`, or one of Otok's controlled response helpers:

```ts
import { fail, json, notFound, redirect } from "otok/server";

export const loader = ({ params }) => {
  if (!params.id) notFound();
  if (params.id === "latest") redirect("/users/alice");
  if (params.id === "api") return json({ userId: "alice" });
  if (params.id === "invalid") {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { email: ["Enter a valid email address"] },
      formErrors: ["Please fix the form"],
    });
  }
  return { userId: params.id };
};
```

`fail(status, failure)` accepts a validation-library-independent shape:

```ts
interface OtokFailure<T = JsonValue> {
  status: number;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  data?: T;
}
```

Controlled failures render `_error.tsx` when present and preserve the intended status code. Without an error route, Otok returns the failure as JSON. Unexpected exceptions still hide raw details by default.

## Route Actions and Progressive Forms

Route modules can export `action` for server-side mutations. Actions run for `POST`, `PUT`, `PATCH`, and `DELETE` requests that match the route.

```tsx
import { fail, redirect, type OtokActionContext, type OtokPageProps } from "otok/server";

export async function action({ formData, method }: OtokActionContext) {
  const name = String(formData?.get("name") ?? "").trim();

  if (method === "DELETE") {
    await deleteProject(String(formData?.get("id") ?? ""));
    redirect("/projects", 303);
  }

  if (!name) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { name: ["Name is required"] },
    });
  }

  await saveProject({ name });
  redirect("/projects", 303);
}

export default function ProjectForm({ actionData }: OtokPageProps) {
  const result = actionData as { fieldErrors?: Record<string, string[]> } | undefined;
  return (
    <form method="post">
      <input name="name" aria-invalid={Boolean(result?.fieldErrors?.name)} />
      {result?.fieldErrors?.name?.map((error) => <p role="alert">{error}</p>)}
      <button>Save</button>
    </form>
  );
}
```

Native forms work without JavaScript. Validation failures re-render the same route with `actionData` and preserve the failure status code. Redirects, JSON responses, native `Response` objects, `notFound()`, and unexpected exceptions use the same response model as loaders.

Browser forms only support `GET` and `POST`. For `PUT`, `PATCH`, and `DELETE`, use a hidden method override:

```html
<input type="hidden" name="_method" value="delete" />
```

Enable progressive form submissions explicitly:

```ts
createOtokClient({ registry: islandModules, softNav: { forms: true } });
```

Production pages without islands normally omit the client module. If a no-island form route should still be enhanced when loaded directly, export `client = true` from that route:

```ts
export const client = true;
```

Enhanced forms are limited to same-origin `GET` and `POST` forms, respect `data-otok-no-nav`, include submitter values, update head and swap regions, hydrate new islands, and fall back to native navigation when unsupported. Otok does not provide automatic CSRF protection; applications using cookie-based sessions should configure CSRF checks in Hono middleware or route middleware.

## Route Middleware

Place `_middleware.ts` files inside `src/app/routes` to apply Hono-style middleware to every route in that directory and its children.

```text
src/app/routes/
  _middleware.ts
  admin/
    _middleware.ts
    index.tsx
```

Middleware runs from parent to child before loaders, actions, and rendering:

```text
root middleware -> admin middleware -> loader/action -> render
```

```ts
import { defineMiddleware, redirect } from "otok/server";

export default defineMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) redirect("/login", 303);
  await next();
});
```

Middleware receives Hono's `Context` and `next`. It may:

- call `await next()` to continue;
- return a native `Response` to short-circuit;
- throw Otok helpers such as `redirect()`, `notFound()`, or `fail()`;
- use `c.set()` / `c.get()` to share request-scoped values with loaders and actions.

Route groups such as `(marketing)` do not affect the URL, but their `_middleware.ts` files still participate in inheritance. Global API routes registered through `createOtokApp({ configure })` remain normal Hono routes and are not affected by route middleware unless they explicitly call the Otok handler.

## Head Metadata

`head()` can return title, description, language, meta tags, links, scripts, and JSON-LD.

```ts
export const head = () => ({
  title: "Dashboard",
  description: "Server-rendered dashboard",
  meta: { "og:type": "website" },
  links: [{ rel: "canonical", href: "https://example.com/" }],
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Otok",
  },
});
```

## Islands

Interactive components live in `src/app/islands` by default. Files in `src/app/routes` whose basename starts with `$` are also treated as islands, which allows colocating route-specific interactive components.

```tsx
import { Island } from "otok/client";
import Counter from "../islands/counter";

export default function Page() {
  return <Island component={Counter} props={{ init: 5 }} strategy="idle" />;
}
```

The plugin injects a stable island ID into each island module based on the filename. Runtime hydration uses the same ID, so production minification cannot change the SSR/client contract.

## Hydration Strategies

`<Island>` supports four strategies:

```text
load         Hydrate immediately
idle         Hydrate with requestIdleCallback or a timeout fallback
visible      Hydrate through IntersectionObserver
media        Hydrate when matchMedia(media) matches
client-only  Emit an empty island shell on the server; hydrate on the client
```

For visible hydration, `rootMargin` is forwarded to `IntersectionObserver`.

```tsx
<Island component={Chart} props={props} strategy="visible" rootMargin="160px" />
```

For media hydration, provide `media`.

```tsx
<Island component={MobileMenu} props={{}} strategy="media" media="(max-width: 768px)" />
```

## Props Transport

Island props must be JSON-serializable. Otok uses two transports:

```text
Small JSON payloads   data-otok-props base64url attribute
Large JSON payloads   adjacent application/json script tag
```

This keeps common islands simple while avoiding oversized HTML attributes for dashboards and lists.

## Virtual Module Types

Apps should reference the plugin types once:

```ts
/// <reference types="vite/client" />
/// <reference types="@otok/vite-plugin/client" />
```

This declares `virtual:otok-routes`, `virtual:otok-islands`, and exports `routePaths` / `OtokRoutePath`. The ambient `OtokRoutePath` type is a broad fallback today; a fully typed route builder is planned separately.

## Route Chrome

Route modules may export `chrome` to provide layout shell metadata:

```tsx
export const chrome = ({ data, params }) => ({
  title: "Documents",
  description: `Review for ${params.id}`,
  toolbar: <Island component={Toolbar} props={{}} />,
});
```

Layouts receive `chrome` on `OtokLayoutProps`. This avoids central route switches inside `_layout.tsx`.

## Security

- Island props are JSON-serialized into HTML. Treat loader output as untrusted when it comes from users or external systems.
- Escape or sanitize user content inside island and page components before rendering.
- Otok escapes HTML in `head()` output and neutralizes `<` in JSON script payloads.
- For strict Content Security Policy, prefer hashed or nonce-based policies and avoid inline scripts outside Otok's managed payloads.
- Soft navigation only applies to same-origin links and skips `/api/` paths.
- Unexpected 500 error details are hidden from `_error.tsx` by default. Set `exposeErrorDetails: true` on `createOtokHandler()` / `createOtokApp()` only when you intentionally want raw error messages, such as local development.

## Theme

Pass `theme: true` to `createOtokHandler()` / `createOtokApp()` to emit the built-in dark-mode bootstrap script and SSR `class="dark"` from the `theme` cookie. Theme is opt-in and disabled by default.

