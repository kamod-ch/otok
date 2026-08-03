# Swiss CRM — Otok Reference Product

Real Swiss B2B CRM validating Otok against business workflows (not a toy demo).

## Stack

- Otok + Preact + PostgreSQL (Kysely)
- `@otok/kit-crm` domain & Zefix import
- `@kamod-ch/otok-auth` (sessions, roles)
- `@kamod-ch/otok-i18n`, `@kamod-ch/otok-validation`
- `@kamod-ch/otok-workflows`, `@kamod-ch/otok-audit`, `@kamod-ch/otok-search`

## Quick start

```bash
# From otok monorepo root
cd examples/kit-crm-swiss
cp .env.example .env
pnpm docker:up
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:5173/login — sign in as admin or sales user.

## Core flows

| Flow | Route |
|------|-------|
| Company search & filter | `/crm` |
| Zefix JSON import + dedup | `/crm/import` |
| Company detail + pipeline | `/crm/companies/:id` |
| Contact, activity, task | Company detail forms |
| Audit log | `/crm/audit` |
| CSV export | POST on `/crm` |
| Pipelines | `/crm/pipelines` |

## Sample Zefix data

See `data/zefix-sample.json` (includes Eirao Reinigung GmbH, CHE474593641).

## Tests

```bash
pnpm test:e2e   # requires dev server + seeded DB
```

## Documentation

- [Deployment](./DEPLOYMENT.md)
- [Framework friction log](./docs/framework-friction.md) — Otok gaps found while building this product

## Mandant & roles

- Mandant: `org-swiss-demo` (Alpine Sales GmbH)
- Admin: full permissions
- Sales: read/write companies, no import by default (import requires `crm:companies:import`)
