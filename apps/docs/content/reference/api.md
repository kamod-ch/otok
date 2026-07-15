---
title: API Reference
section: Reference
order: 50
---
# API Reference

## Server API

```ts
createOtokApp(options)
createOtokHandler(options)
readOtokManifest(import.meta.url)
redirect(location, status?)
notFound(message?)
fail(status, failure)
json(data, init?)
defineMiddleware(middleware)
```

## Client API

```ts
Island
createOtokClient({ registry, softNav })
hydrateIslands(root, registry)
softNavigate(url, registry)
```

## Route Module API

```ts
export const loader = async (context) => data;
export const action = async (context) => result;
export const head = ({ data }) => ({ title: "Page" });
export const chrome = ({ data }) => ({ title: "Shell" });
export const client = true;
export default function Page(props) {}
```

## Generated Virtual Modules

```ts
import { routes, route, routePaths } from "virtual:otok-routes";
import { islandModules } from "virtual:otok-islands";
```

## Typed Routes

```ts
route("/users/[id]", { params: { id: "alice" } });
route("/docs/[...slug]", { params: { slug: ["routing", "catch-all"] } });
```

## CLI and Templates

```bash
pnpm create otok my-app
pnpm create otok my-app --template full
```
