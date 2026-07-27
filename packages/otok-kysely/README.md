# @kamod-ch/otok-kysely

Kysely database integration for [Otok](https://github.com/kamod-ch/otok) — typed `db` in route actions, connection pooling, migrations, seeds, and CLI commands.

## Setup

```ts
import { defineConfig } from "otok";
import kysely from "@kamod-ch/otok-kysely";

export default defineConfig({
  plugins: [
    kysely({
      dialect: "postgres",
      connectionString: process.env.DATABASE_URL,
    }),
  ],
});
```

Install dialect drivers in your app:

| Dialect  | Package          |
|----------|------------------|
| postgres | `pg`             |
| sqlite   | `better-sqlite3` |
| mysql    | `mysql2` + adapter |

```ts
import kysely from "@kamod-ch/otok-kysely";
import { mysqlDialect } from "@kamod-ch/otok-kysely/dialects";

kysely({ dialect: mysqlDialect(), connectionString: env.DATABASE_URL })
```

## Route actions

```ts
import { defineAction, defineLoader } from "@kamod-ch/otok-kysely/loader";

export const loader = defineLoader(async ({ db }) => {
  return db.selectFrom("contacts").selectAll().execute();
});

export const action = defineAction(async ({ db, input }) => {
  return db.insertInto("contacts").values(input).returningAll().executeTakeFirstOrThrow();
});
```

`DATABASE_URL` is validated server-side via `envSchema` — credentials never reach the client bundle.

## Migrations

Migration files live in `migrations/` using the naming convention `YYYYMMDDHHMMSS_name.up.sql` / `.down.sql`.

```bash
otok db:migrate    # apply pending migrations
otok db:rollback   # roll back last migration (--steps N)
otok db:status     # show applied/pending
otok db:seed       # run seed files
```

## Transactions

```ts
import { withTransaction } from "@kamod-ch/otok-kysely";

await withTransaction(db, async (trx) => {
  await trx.insertInto("contacts").values({ name: "Ada" }).execute();
  await trx.insertInto("audit_log").values({ action: "create" }).execute();
});
```

## Test utilities

```ts
import { createTestDatabase } from "@kamod-ch/otok-kysely/test";

const { db, cleanup } = await createTestDatabase({ migrationsDirectory: "./migrations" });
// ... run tests
await cleanup();
```

## Edge runtime

SQLite (`better-sqlite3`) is edge-capable in worker contexts that support native modules. PostgreSQL and MySQL require Node.js runtimes with connection pooling.
