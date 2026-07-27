---
title: Plugins
section: Guides
order: 34
---
# Plugins

Otok ships a typed plugin API for official extensions and app-specific integrations. Plugins are optional — existing composition packages and manual `createOtokApp({ configure })` wiring continue to work.

## Quick start

```bash
pnpm otok add hello
```

Or manually in `otok.config.ts`:

```ts
// otok.config.ts
import { defineConfig } from "otok";
import hello from "@otok/plugin-hello";

export default defineConfig({
  plugins: [hello()],
});
```

Wire resolved runtime config in `src/server.ts`:

```ts
import { createOtokApp, readOtokManifest } from "otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { routes, notFoundRoute, errorRoute } from "virtual:otok-routes";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

export default createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  configure: (app) => {
    void applyAppPlugins(app);
  },
});
```

Apps without `otok.config.ts` keep working. `virtual:otok-config` resolves to an empty config.

## Hook order

Plugins run in declared order:

1. Option validation (`schema`)
2. `config`
3. `configResolved`
4. `configureVite`
5. `configureServer` (dev)
6. `buildStart` / `buildEnd`
7. `configureApp` (runtime)

`buildEnd` runs in reverse order.

## Public vs internal API

| Public | Internal |
|--------|----------|
| `defineConfig`, `definePlugin` | `PluginContainer` internals |
| `OtokPlugin`, `OtokUserConfig` | config file bundling |
| `virtual:otok-config` | generated temp config bundles |
| `virtual:otok-plugin/<name>/<id>` | devtools metadata (reserved) |

## Packages

| Package | Purpose |
|---------|---------|
| `@otok/config` | Plugin contract and resolution |
| `@otok/plugin-hello` | Minimal example plugin |
| `@otok/plugin-fixture` | Test fixture plugin |

See also [Create your first Otok plugin](./create-your-first-plugin.md), [CLI — otok add](./cli-add.md), and [Composition Packages](./extensions.md).
