---
title: Migrate from Remix
section: Migration
order: 72
---
# Migrate from Remix / React Router

Remix-style loaders, actions, and progressive forms map closely onto Otok. The biggest difference: Otok is HTML-first with soft navigation, not a full client-side router.

## Concept mapping

| Remix | Otok |
| --- | --- |
| `loader` | `loader` |
| `action` | `action` |
| `useLoaderData` | `data` page prop |
| `useActionData` | `actionData` page prop |
| `<Form method="post">` | native `<form method="post">` |
| nested routes / outlets | nested `_layout.tsx` + `{children}` |
| client-side routing | soft navigation HTML swaps |
| Resource routes | Hono API routes via `configure` / `createOtokHandler` |

## Actions and PRG

```tsx
import { redirect, validationError, type OtokActionContext, type OtokPageProps } from "otok/server";

export async function action({ formData }: OtokActionContext) {
  const name = String(formData?.get("name") ?? "").trim();
  if (!name) {
    validationError({ fieldErrors: { name: "Required" }, values: { name } });
  }
  await save(name);
  redirect("/projects", 303);
}

export default function Page({ actionData }: OtokPageProps) {
  const errors = (actionData as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  return (
    <form method="post">
      <input name="name" aria-invalid={Boolean(errors?.name)} />
      <button>Save</button>
    </form>
  );
}
```

## Soft navigation (optional SPA feel)

```ts
createOtokClient({ registry: islandModules, softNav: { forms: true } });
```

Mark layout chrome that must update per route with `data-otok-swap`.

## What not to expect

- No React ecosystem (Preact components)
- No `useFetcher` — use forms, fetch, or islands
- No nested pathless client routers

## Next steps

- [Loaders, Actions, and Forms](/core-concepts/loaders-actions-forms/)
- [Islands and Soft Navigation](/core-concepts/islands-soft-navigation/)
