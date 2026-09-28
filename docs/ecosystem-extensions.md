# Otok ecosystem extensions — architecture overview

> **Live inventory:** [Ecosystem catalog](../apps/docs/content/guides/ecosystem.md) (generated from [`docs/ecosystem-catalog.json`](./ecosystem-catalog.json)) lists every published package, version, and integration mode. Use that catalog for current status — not this document's historical tier list.

Optional packages follow a shared shape: typed public contract, provider backends, optional `definePlugin` integration, runtime capability checks, secure defaults, tests, and examples.

## Design principles

| Principle        | Implementation                                                        |
| ---------------- | --------------------------------------------------------------------- |
| Public contract  | `define*` helpers + typed service interface + documented entry points |
| Providers        | In-memory or test providers plus production backends where applicable |
| Plugin API       | `definePlugin` → `configureApp` → registry singleton (when supported) |
| Request context  | AsyncLocalStorage bridge (actor, tenant, requestId) where needed      |
| Capability check | Adapter/runtime checks — fail with readable errors                    |
| Secure defaults  | Redaction, no secrets in client bundles, server-only routes           |
| Tests            | Unit + integration + type tests in package                            |

## Shipped platform packages (examples)

These packages exist in the monorepo today; see the catalog for the full set:

- `@kamod-ch/otok-audit` — immutable audit trail
- `@kamod-ch/otok-events` — domain events and outbox
- `@kamod-ch/otok-search` — search indexes and queries
- `@kamod-ch/otok-queue` / `@kamod-ch/otok-workflows` — jobs and durable workflows
- `@kamod-ch/otok-realtime` — SSE/WebSocket channels

## Not yet published as standalone packages

The diagram below includes **future** extension names that are not packages in this repository. Do not install them until they appear in the ecosystem catalog.

```mermaid
flowchart TB
  export[otok-export future]
  webhooks[otok-webhooks future]
  health[otok-health future]
  notifications[otok-notifications future]
  api[otok-api future]
  openapi[otok-openapi future]

  audit[@kamod-ch/otok-audit]
  search[@kamod-ch/otok-search]
  events[@kamod-ch/otok-events]

  audit --> export
  events --> search
  events --> webhooks
  api --> openapi
```

## Adding a new extension

1. Add the package under `packages/` and publish metadata.
2. Add an entry to `docs/ecosystem-catalog.json`.
3. For CLI-discoverable plugins, update `packages/otok-registry/registry/v1/extensions.json` and run `pnpm --filter @kamod-ch/otok-registry registry:checksum`.
4. Run `pnpm docs:ecosystem:generate` and `pnpm docs:check`.

See [CONTRIBUTING.md](../CONTRIBUTING.md#documentation).
