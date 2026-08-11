# API Stability Report — Otok 1.0 (Draft)

**Generated:** 2026-08-03
**Manifest:** [`api-stability.json`](../../api-stability.json)

## Summary

| Classification | Export count | Symbol count |
|----------------|--------------|--------------|
| Public | 9 subpaths | 15+ core symbols |
| Experimental | 1 subpath + kit/preset APIs | 4 |
| Internal | 3 packages | — |

## Public API guarantee

From **1.0.0**, all **Public** exports follow SemVer:

- No removal or signature change without major bump
- Deprecations follow [deprecation policy](../governance/deprecation-policy.md)
- Contract tests enforce adapter and plugin surfaces

## Stable export map (`otok`)

| Export | Since | Notes |
|--------|-------|-------|
| `otok` / `otok/config` | 0.1 | Config + plugin definition |
| `otok/server` | 0.2 | App factory, SSR |
| `otok/client` | 0.2 | Islands |
| `otok/route` | 0.3 | Loaders, actions |
| `otok/rendering` | 0.4 | Render plans |
| `otok/cache` | 0.4 | Cache layer |
| `otok/shared` | 0.2 | Shared types |
| `otok/client/mutations` | 0.4 | Optimistic UI |

## Experimental

| Surface | Risk | Promotion target |
|---------|------|------------------|
| `otok/devtools` | API may change | 1.1 review |
| `definePreset`, `defineKit` | Kit system evolving | 1.2 |
| `@kamod-ch/otok-registry/fixtures` | Test only | Never public |

## Internal (do not use)

- `@kamod-ch/otok-route-typegen` programmatic API
- Vite plugin private modules
- Plugin `__options` field

## Contract test coverage

| Contract | Package | Status |
|----------|---------|--------|
| Adapter | `otok-adapter-contract` | Enforced |
| Plugin | `@kamod-ch/otok-plugin-contract` | Enforced |
| Config merge | `@kamod-ch/otok-config` tests | Enforced |

## Changes from 0.4

**No breaking Public API changes** planned for 1.0.0.

Experimental kit/preset APIs may receive minor adjustments — not covered by semver.

## Verification

```bash
pnpm api:check
pnpm -r test
```

Report issues: [GitHub Issues](https://github.com/kamod-ch/otok/issues) with label `api-stability`.
