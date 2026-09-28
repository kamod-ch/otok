---
title: Plugins
section: Guides
order: 34
---

# Plugins

Otok plugins extend the build and runtime through typed hooks in `otok.config.ts`. They are one integration mode — many packages also support direct **composition** imports. See [Composition packages](./extensions.md) and the [complete ecosystem catalog](./ecosystem.md) for every official package.

## When to use a plugin

Use a plugin when a package exposes `definePlugin` and you want Vite/server hooks applied automatically:

```bash
pnpm otok add kysely
```

The CLI installs the npm package and registers it in `otok.config.ts` ([CLI — otok add](./cli-add.md)). Registry entries list compatible Otok versions and adapters.

## Manual registration

```ts
// otok.config.ts
import { defineConfig } from "@kamod-ch/otok";
import hello from "@kamod-ch/otok-plugin-hello";

export default defineConfig({
  plugins: [hello()],
});
```

Wire resolved runtime config in `src/server.ts`:

```ts
import { createOtokApp, readOtokManifest } from "@kamod-ch/otok/server";
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

## Authoring

| Topic          | Guide                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Plugin API     | `@kamod-ch/otok-config` — [package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-config) |
| First plugin   | [Create your first Otok plugin](./create-your-first-plugin.md)                                              |
| Setup hooks    | [Plugin setup hooks](./plugin-setup-hooks.md)                                                               |
| Example plugin | `@kamod-ch/otok-plugin-hello`                                                                               |
| Test fixture   | `@kamod-ch/otok-plugin-fixture` (maintainers only)                                                          |

## Public vs internal API

| Public                            | Internal                      |
| --------------------------------- | ----------------------------- |
| `defineConfig`, `definePlugin`    | `PluginContainer` internals   |
| `OtokPlugin`, `OtokUserConfig`    | config file bundling          |
| `virtual:otok-config`             | generated temp config bundles |
| `virtual:otok-plugin/<name>/<id>` | devtools metadata (reserved)  |

The small table above lists **examples**, not the full ecosystem. For every published plugin and extension, use the [ecosystem catalog](./ecosystem.md).
