# @kamod-ch/otok

Hono + Preact Islands framework runtime (current line **0.6.x**, stabilization RC toward **0.7**).

## Docs

| Topic                          | Location                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Routing, SSR, actions, islands | Repository [README](../../README.md), `apps/docs`                                |
| HTML cache (secure defaults)   | [docs/html-cache.md](docs/html-cache.md)                                         |
| Action idempotency             | [docs/idempotency.md](docs/idempotency.md)                                       |
| Progressive forms              | [docs/progressive-forms.md](docs/progressive-forms.md)                           |
| Soft-nav prefetch              | [docs/soft-nav-prefetch.md](docs/soft-nav-prefetch.md)                           |
| Hydration lifecycle            | [docs/hydration-lifecycle.md](docs/hydration-lifecycle.md)                       |
| App migration (stabilization)  | [docs/1.0/migration-stabilization.md](../../docs/1.0/migration-stabilization.md) |
| Release candidate / gates      | [docs/1.0/release-candidate.md](../../docs/1.0/release-candidate.md)             |

## Verify (monorepo root)

```bash
pnpm --filter @kamod-ch/otok test
pnpm release:check   # includes pack consumer + API snapshot
```

Public export classifications: [`api-stability.json`](../../api-stability.json).
