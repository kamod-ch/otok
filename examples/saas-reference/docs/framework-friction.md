# Framework friction — Otok SaaS Reference

Dokumentation aus dem Bau der Referenz-App: was sich bewährt hat und welche APIs verbessert werden sollten.

## Bewährt

### `@kamod-ch/otok-auth`

- **Session-Adapter-Pattern** — sauber trennbar; eigener Snake-Case-Adapter für Postgres war straightforward.
- **Session-Rotation** via `rotationIntervalSeconds` — out of the box.
- **CSRF-Cookie** zusammen mit Session — gut kombinierbar mit `@kamod-ch/otok-security`.
- **`createRequireAuthMiddleware`** — einfache Route-Tree-Absicherung (`dashboard/_middleware.ts`).

### `@kamod-ch/otok-kysely` + `composeLoader`

- **`withDb()` + `composeLoader`** (wie in kit-crm-swiss) skaliert gut für Tenant-Context.
- Migrationen/Seeds über CLI — reproduzierbar mit Docker Postgres.

### `@kamod-ch/otok-validation`

- **`defineAction` + Zod** — konsistente Form-Fehler mit Kamod `FormField`.

### `@kamod-ch/otok-stripe`

- **`BillingAdapter`** — klare Grenze zwischen Stripe und App-Domain.
- **`processStripeEventIdempotently`** — wiederverwendbar; Postgres-Store als dünne Implementierung.
- **Test-Provider** — E2E und lokale Entwicklung ohne Stripe-Account.

### `@kamod-ch/otok-mail` (Test)

- Preview-Route — Einladungs-Mails sofort sichtbar ohne SMTP.

### `@kamod-ch/otok-oauth`

- Plugin mountet Flows automatisch; **OAuthAdapter** mit Kysely `findOrCreateUser` ist minimal.

### `@kamod-ch/otok-audit`

- **`AuditService.record`** — unkompliziert in Actions aufrufbar.
- **Kysely-Store** — persistentes Audit statt Memory.

### `@kamod-ch/otok-security` + `@kamod-ch/otok-observability` + `@kamod-ch/otok-seo`

- Plugin-Reihenfolge Security → Observability → SEO funktioniert wie in `seo-security-observability`.

---

## Verbesserungsbedarf

### 1. `@kamod-ch/otok-stripe` — BillingAdapter im Plugin

**Problem:** `stripe()` mountet Webhooks nur ohne Adapter. `configureStripeApp(app, options, adapter)` ist **nicht** aus dem Public Export (`index.ts`), sondern nur unter `dist/plugin.js`.

**Vorschlag:** Option `billingAdapter` oder `billingAdapterFactory: (db) => BillingAdapter` im Plugin; alternativ Export von `configureStripeApp` aus `@kamod-ch/otok-stripe/plugin`.

**Workaround in Referenz:** Lokales `saasCore`-Plugin importiert Deep-Path `dist/plugin.js`.

### 2. `@kamod-ch/otok-stripe` — Persistente Idempotenz

**Problem:** Plugin verwendet modul-globalen Memory-Store. Für Production nötig: injectable `EventIdempotencyStore`.

**Vorschlag:** `stripe({ idempotencyStore: createKyselyStore(db) })` oder Hook in `configureStripeApp`.

**Workaround:** `Object.assign(getStripeIdempotencyStore(), kyselyStore)` — fragil.

### 3. `@kamod-ch/otok-auth/adapters/kysely` — Spaltenbenennung

**Problem:** Adapter schreibt camelCase (`userId`, `tokenHash`), Referenz-Migration/SQL nutzt snake_case (`user_id`). Inkonsistenz zwischen README-Migration und Adapter.

**Vorschlag:** Entweder dokumentierter `CamelCasePlugin` für Postgres oder Adapter-Option `columnNaming: "snake"`.

**Workaround:** Eigener `createSaasSessionAdapter` in `src/db/session.ts`.

### 4. `@kamod-ch/otok-validation` + Tenant-Context

**Problem:** Kein Standard für „auth user + org + db“ in Actions. CRM hat `defineCrmAction`; SaaS brauchte `defineSaasSchemaAction`.

**Vorschlag:** Otok Core oder `@kamod-ch/otok-kit-saas` mit `defineTenantAction` / `composeAction` analog zu `composeLoader`.

### 5. `@kamod-ch/otok-audit` — Kysely-Store zur Laufzeit

**Problem:** Audit-Plugin erstellt Store bei `configureApp` — Kysely-DB ist verfügbar, aber `audit({ provider: { type: "custom", store }})` erfordert manuelles Wiring in zweitem Plugin.

**Vorschlag:** `audit({ provider: { type: "kysely" }})` mit Auto-Resolve aus Kysely-Runtime (wie Mail/Stripe Registry).

### 6. `@kamod-ch/otok-kit-saas`

**Problem:** Paket ist Stub; Referenz-Logik liegt vollständig in `examples/saas-reference`.

**Vorschlag:** Extrahieren: Permissions-Matrix, `defineSaasLoader`, Billing-Helpers, Einladungs-Flow in `@kamod-ch/otok-kit-saas`.

### 7. Multi-Tenant Cookie

**Problem:** Aktive Organisation via Cookie (`saas_org`) — kein First-Class-API in Auth.

**Vorschlag:** Tenant-Middleware in `@kamod-ch/otok-auth` (`createTenantMiddleware`) mit dokumentiertem Cookie/Header-Contract.

### 8. E2E + DB in CI

**Problem:** Wie kit-crm-swiss fehlt noch ein dedizierter GitHub-Actions-Job für `saas-reference` E2E.

**Vorschlag:** Job `saas-e2e` analog `crm-e2e` (Docker Postgres 5434, migrate, seed, playwright).

---

## Zusammenfassung

Die Referenz-App zeigt, dass Otok für SaaS **produktionsnah** skaliert, wenn man Plugins kombiniert und Tenant-Logik in dünnen App-Layern hält. Die größte Reibung liegt bei **Stripe-Webhook + BillingAdapter-Wiring**, **Session-Adapter-Spalten**, und **fehlenden SaaS-Kit-Abstraktionen** — nicht bei Routing, Validation oder Auth-Kern.
