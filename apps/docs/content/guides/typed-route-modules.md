# Typed Route Modules

Otok route modules can export typed loaders, actions, metadata, and page components. Route types are generated from the filesystem route tree and each route module's exports.

## Route module API

```tsx
import { defineLoader, defineAction, defineMeta, defineSearchParams } from "otok/route";

export const searchParams = defineSearchParams(mySearchSchema);

export const loader = defineLoader(async ({ params, request }) => {
  return { company: { id: params.companyId, name: "Acme" } };
});

export const action = defineAction({
  schema: companySchema,
  handler: async ({ input, params }) => updateCompany(params.companyId, input),
});

export const head = defineMeta(({ data }) => ({
  title: data.company.name,
}));

export default function CompanyPage({ loaderData, actionData }: Route.ComponentProps) {
  return <h1>{loaderData.company.name}</h1>;
}
```

Generated `.d.ts` files augment each route module with a `Route` namespace:

- `Route.Params` — URL params inferred from `[param]`, `[[optional]]`, `[...catchAll]`
- `Route.SearchParams` — when `searchParams` / `search` export uses `defineSearchParams`
- `Route.LoaderData`, `Route.ActionInput`, `Route.ActionData`
- `Route.ComponentProps`, `Route.ErrorProps`
- `Route.Meta`

Runtime page props include both `loaderData` and legacy `data`.

## Type generation

Generated files live in `.otok/types/` by default. Include them in `tsconfig.json`:

```json
{
  "include": ["src", ".otok/types/**/*.d.ts"]
}
```

Add `.otok/` to `.gitignore` if you prefer CI-only generation, or commit generated files for zero-config clones.

| Trigger | Command / hook |
|---|---|
| Dev server | `@otok/vite-plugin` regenerates on route file changes (debounced) |
| Production build | `buildStart` hook runs typegen in strict mode |
| CI | `otok typegen --strict` |
| Inspect tree | `otok routes` |

## Typed links and redirects

`virtual:otok-routes` receives literal path unions via generated `manifest.d.ts`:

```tsx
import { route } from "virtual:otok-routes";

route("/companies/[companyId]", { params: { companyId: "acme" } });
```

Redirect targets can use `import type { RedirectTarget } from "virtual:otok-route-redirect"`.

## Conflict detection

`otok typegen --strict` and production builds fail on:

- duplicate resolved paths from different files (`ROUTE_CONFLICT`)
- shadowed routes (`SHADOWED_ROUTE`, warning)

Errors include the route path and source file.

## Example

See `examples/typed-routes` for nested layouts, dynamic params, optional locale segments, and catch-all routes.
