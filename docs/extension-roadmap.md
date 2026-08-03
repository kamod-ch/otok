# Otok extension roadmap

Optional packages around Otok core. Core stays free of auth, validation, database, and UI dependencies.

## Plugin system — shipped

Typed plugin API via `@otok/config`, integrated by `@otok/vite-plugin`:

- `defineConfig` / `definePlugin` from `otok`
- `otok.config.ts` with deterministic hook order
- `virtual:otok-config` runtime bridge
- Example: `@otok/plugin-hello`

See `apps/docs/content/guides/plugins.md` and `docs/adr/0006-plugin-system.md`.

Composition packages (`@kamod-ch/otok-*`) remain valid without plugin wrappers.

## Shipped

### `@kamod-ch/otok-auth`

Cookie sessions, CSRF, password hashing, route/API middleware.

Adapter pattern: apps implement `SessionAdapter<TUser>` for persistence and user resolution.

### `@kamod-ch/otok-validate`

Zod → `validationError()` bridge for route actions and JSON APIs.

### `@kamod-ch/otok-flash`

Signed one-time flash cookies for PRG redirects and SSR toasts.

## Next: session adapters (extract from apps)

Goal: move repeated adapter code out of kamod-scout and devjobs without forcing a schema.

### `@kamod-ch/otok-auth/adapters/memory` — shipped

In-memory session store with optional persistence hooks. devjobs file adapter uses this.

### `@kamod-ch/otok-auth/adapters/kysely` — shipped

Session CRUD via Kysely; kamod-scout uses this with app-specific `resolveUser` joins.

## Later: auth middleware extensions — shipped

In `otok-auth/middleware`:

- `createTenantMiddleware` / `createSessionContextMiddleware`
- `createRequireRoleMiddleware`
- `composeMiddleware`

## Later: `@kamod-ch/otok-flash` — shipped

Signed one-time flash cookies for PRG redirects. devjobs logout → login flow uses it.

## Shipped: `@kamod-ch/otok-stripe`

Checkout Sessions, Customer Portal, webhook signature verification, idempotent event processing, typed Otok actions, test provider, and a `BillingAdapter` for plan sync. Apps own persistence; Otok core stays free of Stripe.

## Shipped: `@kamod-ch/otok-mail`

Provider-based mail — SMTP, Resend, Mailpit, and test provider. Preact templates, dev preview, retry, and secure secret handling.

## Shipped: `@kamod-ch/otok-storage`

Provider-based object storage — local filesystem, S3, R2, MinIO. Upload/download/delete, presigned URLs, MIME and size validation, typed bucket config.

## Shipped: `@kamod-ch/otok-queue`

Typed jobs with retry/backoff, idempotency keys, dead-letter behavior, cron schedules, and in-memory dev/test provider.

## Shipped: `@kamod-ch/otok-oauth`

GitHub and Google authorization-code login with signed state/PKCE cookies and an `OAuthAdapter`. Apps own user persistence and call `@kamod-ch/otok-auth` `createSession`.

## Shipped: `@kamod-ch/otok-i18n`

Locale resolution (URL/domain → cookie → `Accept-Language` → default), lazy message catalogs, pluralization, `Intl` formatters, Otok plugin API, SSR/hydration payload, hreflang metadata, and localized sitemap helpers. Apps own catalogs; Otok core stays free of i18n.

## Shipped: `@kamod-ch/otok-kysely`

Kysely database plugin with typed `db` context, PostgreSQL/SQLite/MySQL dialects, connection pooling, migrations, seeds, transactions, test utilities, and CLI commands (`otok db:migrate`, `db:rollback`, `db:seed`, `db:status`).

## Shipped: `@kamod-ch/otok-validation`

Standard Schema validation with `defineAction` schema integration, field/form errors, FormData/JSON/params parsing, and adapters for Zod, Valibot, and ArkType.

## Deferred

- Generic OIDC provider — wait for a concrete flow
- Account linking UX beyond the existing `linkAccount` adapter hook — wait for a concrete flow
- Better Auth adapter (`otok-better-auth`) — intentionally deferred; see `docs/auth-architecture.md`

## Plugin system follow-ups

- Render hooks (`transformHtml`) and programmatic `registerRoutes` — **shipped** (ADR 0007)
- Deeper Devtools metadata beyond the base panel

## Extraction order

1. `@kamod-ch/otok-validate` ✅ (+ plugin wrapper)
2. `otok-auth/adapters/memory` ✅
3. `otok-auth/adapters/kysely` ✅
4. RBAC/tenant middleware in `otok-auth` ✅
5. `otok-flash` ✅ (+ plugin wrapper)
6. `otok-stripe` ✅
7. `otok-oauth` ✅ (GitHub, Google, Microsoft, GitLab)
8. `otok-i18n` ✅
9. `otok-validation` ✅ (+ plugin wrapper)
