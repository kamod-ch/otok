---
title: Migrate from Fresh
section: Migration
order: 71
---
# Migrate from Fresh

Fresh popularized islands and progressive enhancement on Deno. Otok keeps the islands mental model on Hono + Preact + Vite with Node as the Phase 1 reference runtime.

## Concept mapping

| Fresh | Otok |
| --- | --- |
| `routes/` | `src/app/routes/` |
| `_app.tsx` / layouts | `_layout.tsx` |
| Island components | `src/app/islands/` + `<Island>` |
| Handlers (`GET`/`POST`) | `loader` / `action` exports |
| `ctx.params` | `params` on loader/action context |
| Partial / client nav | Soft navigation (`softNav: true`) |
| Deno Deploy | Node first; Edge adapter targeted for 1.x |

## Route module

```tsx
// Fresh-style handler becomes:
export const loader = ({ params }) => ({ id: params.id });

export async function action({ formData }) {
  // mutations
}

export default function Page({ data, actionData }) {
  return <p>{data.id}</p>;
}
```

## Islands

```tsx
import { Island } from "otok/client";
import Counter from "../islands/counter";

<Island component={Counter} props={{ init: 0 }} strategy="visible" />
```

Props must be JSON-serializable. Prefer small payloads.

## Forms

Native HTML forms work without JavaScript. Enable progressive enhancement with:

```ts
createOtokClient({ registry: islandModules, softNav: { forms: true } });
```

## Next steps

- Read [Routing](/core-concepts/routing/)
- Read [Loaders, Actions, and Forms](/core-concepts/loaders-actions-forms/)
- Scaffold with `pnpm create otok my-app`
