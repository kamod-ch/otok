# ADR 0006: Otok plugin system

## Status

Accepted

## Context

Otok previously shipped optional packages as manual composition (`createOtokApp({ configure })`, route middleware, adapters). Official extensions such as OAuth and i18n repeated the same wiring patterns.

## Decision

Introduce a typed plugin API in `@kamod-ch/otok-config`, integrated by `@kamod-ch/otok-vite-plugin`:

- `otok.config.ts` with `defineConfig({ plugins: [...] })`
- Deterministic hook order documented in `@kamod-ch/otok-config`
- Runtime bridge via `virtual:otok-config`
- Plugin virtual modules namespaced as `virtual:otok-plugin/<name>/<id>`

Existing apps without `otok.config.ts` remain compatible.

## Consequences

- Composition packages can expose optional plugin entry points without forcing migration.
- Plugin config merges are explicit; plugins cannot mutate unrelated user config keys.
- Server hooks stay in the SSR bundle through config resolution at server startup.
- Devtools metadata, programmatic route registration, and render hooks are deferred to follow-up ADRs.
