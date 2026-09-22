# Devjobs reference (Otok)

Small job-board reference app for realistic Otok integration: PostgreSQL + Kysely, auth sessions, CSRF, tenant-scoped authorization, cached public listings (`q` / `page`), CSV import via `@kamod-ch/otok-queue`, and Kamod UI forms.

Not a full job portal — two seeded tenants, public listings, employer CRUD, and queue import only.

## Prerequisites

- Node 20+
- pnpm (from Otok monorepo root)
- Docker (PostgreSQL)

## Fresh checkout → smoke test

```bash
cd otok
pnpm install

# Database
pnpm --filter devjobs-reference docker:up
pnpm --filter devjobs-reference db:migrate
pnpm --filter devjobs-reference db:seed

# Terminal A — web
pnpm --filter devjobs-reference dev

# Terminal B — queue worker (CSV imports)
pnpm --filter devjobs-reference worker
```

Open [http://localhost:5180/jobs](http://localhost:5180/jobs).

### Demo users

| User | Password | Company |
|------|----------|---------|
| `alice@alpha.ch` | `seed-password` | Alpha AG |
| `bob@beta.ch` | `seed-password` | Beta GmbH |

Private job `internal-alpha-hr` is visible to Alpha members only (server-side membership, not headers).

### CSV import

1. Sign in as Alice → **CSV import**
2. Paste `fixtures/import-sample.csv` (max 20 rows)
3. Watch status on the import detail page; worker must be running
4. Test mail: [http://localhost:5180/__otok-mail/preview](http://localhost:5180/__otok-mail/preview) (test provider)

### Integration tests

HTTP tests (dev server required):

```bash
export DEVJOBS_INTEGRATION=1
export DEVJOBS_TEST_URL=http://127.0.0.1:5180
pnpm --filter devjobs-reference test:integration
```

PostgreSQL queue dedupe test:

```bash
export DEVJOBS_TEST_DATABASE_URL=postgres://otok:otok@localhost:5435/devjobs_reference
pnpm --filter devjobs-reference test:integration
```

Playwright (dev server running):

```bash
pnpm --filter devjobs-reference test:e2e
```

## Environment

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | `postgres://otok:otok@localhost:5435/devjobs_reference` |
| `AUTH_SECRET` | dev default in `otok.config.ts` |
| `APP_URL` | `http://localhost:5180` |
| `WORKER_HEALTH_PORT` | `9091` |

## Architecture notes

- **Cache scope**: `setOtokCacheScope` in `devjobs-core` uses session user + DB membership (`tenantId`), plus i18n locale — never `X-Tenant` or form `tenantId`.
- **Mutations**: Zod schemas, CSRF (`@kamod-ch/otok-security`), employer loader resolves company from membership.
- **Queue**: Postgres provider; import jobs use idempotency keys; workers at-least-once with dedupe on `(company_id, external_ref)`.
