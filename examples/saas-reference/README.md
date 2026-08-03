# Otok SaaS Reference Application

Vollständige Multi-Tenant-SaaS-Referenz auf Otok — kein Mock-Dashboard, sondern ein durchgängiger Produktablauf.

## Kernablauf

1. **Registrierung** (`/register`) — Passwort-Hash, Session, CSRF
2. **Organisation erstellen** (`/org/new`) — Owner-Rolle, Free-Plan, Audit-Eintrag
3. **Team einladen** (`/dashboard/team`) — sichere Token (nur Hash in DB), E-Mail via Test-Provider
4. **Tarif wählen** (`/dashboard/billing`) — Stripe Checkout (Test-Provider lokal)
5. **Webhook** (`/api/billing/webhook`) — Signaturprüfung, Postgres-Idempotenz
6. **Berechtigungen** — Rolle × Plan (`src/lib/permissions.ts`)
7. **Audit Log** (`/dashboard/audit`) — Kysely-Store in PostgreSQL

## Stack

| Bereich | Paket |
|---------|--------|
| Auth & Sessions | `@kamod-ch/otok-auth` (Rotation, CSRF-Cookie) |
| OAuth | `@kamod-ch/otok-oauth` |
| DB | `@kamod-ch/otok-kysely` + PostgreSQL |
| Validation | `@kamod-ch/otok-validation` + Zod |
| E-Mail | `@kamod-ch/otok-mail` (Test-Provider, Preview unter `/__otok/mail/preview`) |
| Stripe | `@kamod-ch/otok-stripe` |
| Audit | `@kamod-ch/otok-audit` + Kysely |
| Security | `@kamod-ch/otok-security` (Rate Limits, CSRF, Headers) |
| Observability | `@kamod-ch/otok-observability` |
| i18n / SEO | `@kamod-ch/otok-i18n`, `@kamod-ch/otok-seo` |
| UI | `@kamod-ch/otok-kamod`, `@kamod-ch/ui` |

## Schnellstart

```bash
cd examples/saas-reference
cp .env.example .env
pnpm docker:up
pnpm install   # im otok-Monorepo-Root
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Demo-Login nach Seed: `demo@example.com` / `demo-password`

## Tests

```bash
pnpm test          # Vitest (Permissions, Password, IDs)
pnpm test:e2e      # Playwright (Dev-Server muss laufen)
```

## Deployment

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) und [docs/STRIPE_LOCAL.md](./docs/STRIPE_LOCAL.md).

## Framework-Feedback

Welche Otok-APIs gut funktionieren und wo Reibung entsteht: [docs/framework-friction.md](./docs/framework-friction.md).
