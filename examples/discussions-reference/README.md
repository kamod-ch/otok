# Discussions Reference

Kleine Referenz-App für `@kamod-ch/otok-discussions`: Artikelliste, drei Diskussionsmodi (offen / geschlossen / moderiert), Otok-Auth, PostgreSQL und Playwright-Checks mit DB-Zählerstand.

## Voraussetzungen

- Node 22+, pnpm (Monorepo-Root `otok/`)
- Docker (PostgreSQL)

## Start (frischer Checkout)

```bash
cd otok
pnpm install
cd examples/discussions-reference
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

App: [http://localhost:5195](http://localhost:5195)

## Migration & Seed

| Befehl            | Beschreibung                                          |
| ----------------- | ----------------------------------------------------- |
| `pnpm db:migrate` | App-Migrationen + `migrateDiscussionsSchema` (Kysely) |
| `pnpm db:seed`    | Idempotenter Seed (Tenants, User, Artikel, Threads)   |
| `pnpm db:status`  | Migrationsstatus                                      |

`DATABASE_URL` (Default): `postgres://otok:otok@localhost:5437/discussions_reference`

## Testbenutzer

Passwort für alle: **`reference`** (fiktive `@ref.local`-Adressen, keine PII)

| E-Mail                | Rolle                                                        |
| --------------------- | ------------------------------------------------------------ |
| `reader.a@ref.local`  | Tenant A Leser                                               |
| `trusted.a@ref.local` | Tenant A trusted (sofort publiziert auf moderiertem Artikel) |
| `mod.a@ref.local`     | Tenant A Moderator                                           |
| `admin.a@ref.local`   | Tenant A Admin                                               |
| `reader.b@ref.local`  | Tenant B Leser                                               |
| `mod.b@ref.local`     | Tenant B Moderator                                           |
| `admin.b@ref.local`   | Tenant B Admin                                               |

## Artikel & Diskussion

| Slug              | Modus                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| `open-debate`     | Offener Thread                                                         |
| `closed-archive`  | Geschlossener Thread                                                   |
| `moderated-piece` | Moderiert (Leser → pending via Referenz-Spam-Provider, trusted → live) |

- Vorschau: `/discussions/:slug` (in Artikel eingebettet)
- Vollständige Diskussion: `/discussions/:slug/thread`
- Moderation: `/discussions/moderation/queue`

## Prüfkommandos

```bash
pnpm typecheck
pnpm test:integration   # Postgres: Reaktions-Konkurrenz
pnpm test:e2e           # startet `pnpm dev`, prüft u.a. Kommentar-Zähler in DB
```

Keine echten E-Mail-, Push- oder KI-Dienste.

## End-to-End-Szenarien (Abdeckung)

Die Playwright- und Integrationstests adressieren u.a.: Gast → Login, Kommentar ohne JS, 422 ohne Doppel-Mutation, trusted vs. pending, Tenant-Moderator-Isolation, Mobile/A11y-Smoke, Reaktions-Konkurrenz. Weitere Szenarios (geschlossener Thread TOCTOU, Reports/Audit, Permalink, Cache/Locale) sind über Seed-Daten und die Discussions-Plugin-Tests im Paket abgedeckt; bei Bedarf in `tests/e2e/` erweitern.
