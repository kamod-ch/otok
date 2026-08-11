# ADR 0007: Plugin render hooks and programmatic routes

## Status

Accepted (v1 surface)

## Context

ADR 0006 shipped the typed plugin API with `configureApp`, Vite, and config hooks. Extensions such as SEO, mail preview, and auth still need:

1. **Programmatic routes** — plugins that register HTTP page/API routes without requiring files under `src/app/routes/`
2. **HTML transform hooks** — post-process buffered SSR HTML (inject tags, rewrite attributes) without forking the renderer

Streaming responses intentionally skip `transformHtml` until a streaming-safe API is designed.

## Decision

Extend `OtokPlugin` in `@kamod-ch/otok-config`:

```ts
registerRoutes?(ctx): ProgrammaticRouteDefinition[] | Promise<...>
transformHtml?(html, ctx): string | Promise<string>
```

`ResolvedOtokConfig` exposes:

- `collectPluginRoutes()` — merges all `registerRoutes` results in plugin order
- `transformHtml(html, meta)` — runs transforms in plugin order for buffered HTML only

Adapters / app bootstraps merge plugin routes into the file-route list:

```ts
const pluginRoutes = await collectPluginRoutes();
createOtokApp({
  routes: [...fileRoutes, ...toOtokRoutes(pluginRoutes)],
  transformHtml,
});
```

`createOtokHandler` accepts optional `transformHtml` and applies it after buffered `pageHtml()` (not on streaming bodies).

## Consequences

- Plugins can ship demo/admin routes without scaffolding files.
- HTML transforms stay opt-in and buffered-only (predictable, no stream rewrites).
- File routes remain the primary DX; programmatic routes are an escape hatch.
- Future work: streaming-safe transforms, typed `RouteModule` without `unknown` casts.
