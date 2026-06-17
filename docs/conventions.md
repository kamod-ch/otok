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

## Special Routes

Two reserved files provide convention-based fallbacks:

```text
_not-found.tsx    Rendered for unmatched routes or `notFound()`
_error.tsx        Rendered for thrown errors and `fail()`
```

Use helpers from `otok/server` or `otok/shared` inside loaders:

```ts
import { notFound, redirect } from "otok/server";

export const loader = ({ params }) => {
  if (!params.id) notFound();
  if (params.id === "latest") redirect("/users/alice");
  return { userId: params.id };
};
```

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
load      Hydrate immediately
idle      Hydrate with requestIdleCallback or a timeout fallback
visible   Hydrate through IntersectionObserver
media     Hydrate when matchMedia(media) matches
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

This declares `virtual:otok-routes` and `virtual:otok-islands`.
