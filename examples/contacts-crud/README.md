# Contacts CRUD Example

Full CRUD example using `@kamod-ch/otok-kysely` and `@kamod-ch/otok-validation`.

## Setup

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:5173/contacts](http://localhost:5173/contacts).

## Features demonstrated

- Kysely plugin with SQLite dialect
- Typed `db` in loaders and actions via `defineLoader` / `defineAction`
- Zod schema validation with field errors and form redisplay
- HTML form progressive enhancement (`client: true` via soft-nav)
- Migrations and seeds
- CLI commands: `db:migrate`, `db:seed`, `db:status`, `db:rollback`

## Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/contacts` | GET | List all contacts |
| `/contacts/new` | GET/POST | Create contact |
| `/contacts/:id` | GET | View contact |
| `/contacts/:id/edit` | GET/POST | Update contact |
| `/contacts/:id/delete` | POST | Delete contact |

## Environment

```env
DATABASE_URL=sqlite://./data/contacts.db
```

`DATABASE_URL` is server-only — never bundled for the client.
