# Compatibility Matrix

Supported combinations for Otok **1.0** (draft).  
Update when core or adapter majors change.

## Runtime

| Component | Supported versions | Notes |
|-----------|-------------------|-------|
| Node.js | 20.x, 22.x | 22 recommended for CI |
| pnpm | 10.x | Workspace package manager |
| TypeScript | 5.6+, 6.x | Peer/dev dependency |

## Core stack

| Package | 1.0 range | Linked |
|---------|-----------|--------|
| `otok` | `1.0.x` | Yes |
| `@kamod-ch/otok-vite-plugin` | `1.0.x` | Yes |
| `create-otok` | `1.0.x` | Yes |
| `@kamod-ch/otok-config` | `^0.2.0` → `^1.0.0` at 1.0 | No |
| `@kamod-ch/otok-test` | `^0.4.0` → `^1.0.0` at 1.0 | No |
| `otok-cli` | `^0.1.0` → `^1.0.0` at 1.0 | No |

## Adapters

| Adapter | Min Otok | Max tested Otok |
|---------|----------|-----------------|
| `otok-adapter-node@1.x` | `0.4.0` | `1.0.x` |
| `otok-adapter-cloudflare@1.x` | `0.4.0` | `1.0.x` |
| `otok-adapter-static@1.x` | `0.4.0` | `1.0.x` |

## Official plugins (registry)

Each extension declares `otokVersion` in `@kamod-ch/otok-registry`. At 1.0 launch, registry entries will require `^1.0.0` or document cross-compat ranges.

| Plugin | Current | Otok 1.0 compat (planned) |
|--------|---------|---------------------------|
| `@kamod-ch/otok-kysely` | 2.0.0 | `^1.0.0 \|\| ^0.4.0` during transition |
| `@kamod-ch/otok-auth` | 2.0.0 | `^1.0.0` |
| `@kamod-ch/otok-i18n` | 3.0.0 | `^1.0.0` |
| Newer 0.1 plugins | 0.1.0 | `^1.0.0` |

Run `otok doctor` in your project for live compatibility output.

## Framework peers

| Peer | Range |
|------|-------|
| `preact` | `>=10.26.0` |
| `hono` | Bundled in otok; plugins may peer `^4.x` |
| `@hono/node-server` | `>=2.0.0` (optional) |

## Verification

```bash
pnpm -r typecheck
pnpm test
pnpm --filter otok-adapter-node test
pnpm --filter otok-adapter-cloudflare test
otok doctor
```

See also [support-matrix.md](../1.0/support-matrix.md) for platform/deployment support.
