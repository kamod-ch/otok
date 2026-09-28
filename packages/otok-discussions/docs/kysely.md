# Kysely persistence (`@kamod-ch/otok-discussions/kysely`)

## Migration

```ts
import { Kysely } from "kysely";
import {
  migrateDiscussionsSchema,
  rollbackDiscussionsSchema,
  createKyselyDiscussionAdapter,
  type DiscussionsDatabase,
} from "@kamod-ch/otok-discussions/kysely";

await migrateDiscussionsSchema(db, "postgres"); // or "sqlite"
// await rollbackDiscussionsSchema(db, "sqlite");
```

Migration id: `20260926120000_discussions_initial`. Outbox/subscription tables are **not** part of the MVP schema.

## Tenant NULL semantics

PostgreSQL and SQLite differ on `UNIQUE` with `NULL`. All uniqueness and isolation use a non-null `tenant_key`:

| App `tenantId` | `tenant_key` (stored) | `tenant_id` (stored) |
| -------------- | --------------------- | -------------------- |
| `"acme"`       | `acme`                | `acme`               |
| `""`           | `__tenant_none__`     | `""`                 |

Never rely on `NULL` tenant ids in constraints. Use `encodeTenantKey` / `decodeTenantId` when writing custom SQL.

## SQLite limits

- Partial unique indexes (open reports, reaction dedupe) require SQLite ≥ 3.8 — same as Otok’s bundled driver.
- No `FOR UPDATE` row locking; high write contention on counters may need app-level retry (Postgres integration tests cover stricter concurrency).
- `better-sqlite3` is dev/test only; production SQLite apps supply their own Kysely dialect.

## Integration tests

```bash
# SQLite (default, in-memory)
pnpm --filter @kamod-ch/otok-discussions test

# PostgreSQL
OTOK_DISCUSSIONS_PG_TEST_URL=postgres://... pnpm --filter @kamod-ch/otok-discussions test
```
