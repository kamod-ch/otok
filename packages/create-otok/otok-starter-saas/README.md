# Otok SaaS starter

Production-oriented starter with optional Kamod UI integration via `@kamod-ch/otok-kamod` (not Otok core).

## Includes

- Cookie sessions with `@kamod-ch/otok-auth` + Kysely adapter
- Email/password login and logout
- Protected `/dashboard` and `/projects` routes
- SQLite + Kysely migrations and seeds
- `@kamod-ch/otok-validation` + Kamod form fields
- `@kamod-ch/otok-i18n` (de/en)
- `@kamod-ch/otok-seo` and `@kamod-ch/otok-security`
- Vitest smoke tests

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Demo login: `demo@example.com` / `demo-password`

## Kamod separation

UI styling comes from `@kamod-ch/otok-kamod`. Remove the `kamod()` plugin and Kamod packages to run a plain Otok stack — auth, kysely, and validation remain independent.
