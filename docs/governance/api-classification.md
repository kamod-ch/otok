# API Classification

Otok classifies every exported surface as **Public**, **Experimental**, or **Internal**.

Machine-readable manifest: [`api-stability.json`](../../api-stability.json) at repo root.

## Classifications

| Level | SemVer | Who may use | Breaking changes |
|-------|--------|-------------|------------------|
| **Public** | Full SemVer | Application and plugin authors | Major only + migration guide |
| **Experimental** | Minor may break | Early adopters with explicit opt-in | Document in changelog |
| **Internal** | None | Otok monorepo only | Any time |

## Public surfaces (1.0)

### `otok` package exports

- `otok`, `otok/config` — configuration API
- `otok/server` — app bootstrap, handlers, streaming
- `otok/client` — islands, hydration
- `otok/shared` — shared types and utilities
- `otok/route` — loaders, actions, meta
- `otok/rendering` — render plans
- `otok/cache` — cache providers
- `otok/client/mutations` — optimistic mutations

### Tooling

- `otok` CLI commands documented in README
- `@kamod-ch/otok-test` — testing utilities

## Experimental surfaces (1.0)

| Surface | Reason |
|---------|--------|
| `otok/devtools` | Dev-only, API evolving |
| `definePreset`, `defineKit`, `mergeKits` | Preset/kit system at 0.1 |
| `@kamod-ch/otok-registry` fixture export | Test infrastructure |

Experimental APIs must be marked with `@experimental` in docs and may log runtime warnings when imported.

## Internal surfaces

Do not import from:

- `@kamod-ch/otok-route-typegen` (CLI/typegen internal)
- `@kamod-ch/otok-registry/fixtures`
- Vite plugin internals not re-exported by `otok`
- Plugin `__options` marker field

## Enforcement

```bash
pnpm api:check
```

Validates that published package `exports` in `package.json` match the manifest. CI fails on undocumented new exports.

## Promoting Experimental → Public

1. Open RFC (see [rfc-process.md](./rfc-process.md))
2. Add/adjust contract tests
3. Update `api-stability.json`
4. Document in API reference
5. Minimum one minor release at Experimental before promotion
