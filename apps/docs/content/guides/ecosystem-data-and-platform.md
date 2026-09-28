---
title: Ecosystem — data and platform
section: Guides
order: 6
---

# Data and platform packages

Persistence, messaging, storage, and background processing for Otok apps. Most packages support **plugin** registration (`pnpm otok add …`) and **composition** imports in route loaders and server modules.

See the [complete ecosystem catalog](./ecosystem.md) for versions and install commands.

## Packages

| Package                    | When to use                    | Integration          | Deep dive                                                                            |
| -------------------------- | ------------------------------ | -------------------- | ------------------------------------------------------------------------------------ |
| `@kamod-ch/otok-kysely`    | Typed SQL, migrations, seeds   | plugin + composition | [Kysely guide](./kysely.md)                                                          |
| `@kamod-ch/otok-supabase`  | Supabase auth + Postgres SSR   | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-supabase)  |
| `@kamod-ch/otok-storage`   | Object storage (local, S3, R2) | plugin + composition | [Storage guide](./otok-storage.md)                                                   |
| `@kamod-ch/otok-search`    | App search indexes             | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-search)    |
| `@kamod-ch/otok-events`    | Domain events and outbox       | plugin               | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-events)    |
| `@kamod-ch/otok-queue`     | Background jobs and retries    | plugin               | [Queue guide](./otok-queue.md)                                                       |
| `@kamod-ch/otok-workflows` | Multi-step durable workflows   | plugin               | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-workflows) |
| `@kamod-ch/otok-realtime`  | SSE / WebSocket channels       | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-realtime)  |

## Runtime and adapters

Queue and workflow providers may require Node APIs. Check adapter capabilities with [Deployment adapters](./adapters.md) before deploying to Edge-only runtimes.

## Security

Store database and storage credentials in environment variables. Never expose service-role keys to client bundles.

## Examples

- [`examples/with-supabase`](https://github.com/kamod-ch/otok/tree/main/examples/with-supabase)
- [`examples/devjobs-reference`](https://github.com/kamod-ch/otok/tree/main/examples/devjobs-reference) (Postgres + queue)
