# Database (Kysely)

`@kamod-ch/otok-kysely` adds a typed Kysely instance to every request via the Otok plugin system.

## Setup

```ts
import { defineConfig } from "@kamod-ch/otok";
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

`DATABASE_URL` is validated server-side and never included in the client bundle.

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

## Migrations

Place SQL files in `migrations/`:

```text
migrations/
  20260101000001_create_contacts.up.sql
  20260101000001_create_contacts.down.sql
```

Run with the CLI:

```bash
otok db:migrate
otok db:rollback --steps 1
otok db:status
otok db:seed
```

## Transactions

```ts
import { withTransaction } from "@kamod-ch/otok-kysely";

await withTransaction(db, async (trx) => {
  await trx.insertInto("contacts").values({ name: "Ada" }).execute();
  await trx.insertInto("audit_log").values({ action: "create" }).execute();
});
```

## Dialects

| Dialect  | Config |
|----------|--------|
| PostgreSQL | `dialect: "postgres"` + `pg` |
| SQLite | `dialect: "sqlite"` + `better-sqlite3` |
| MySQL | `dialect: mysqlDialect()` + `mysql2` |

MySQL uses an extensible adapter — bring your own pool configuration via `DialectAdapter`.

## Edge runtime

SQLite is suitable for edge/worker deployments that support native modules. PostgreSQL and MySQL require Node.js with connection pooling.

## Example

See `examples/contacts-crud` for a full CRUD app with migrations and seeds.
