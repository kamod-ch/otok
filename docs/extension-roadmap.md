# Otok extension roadmap

Optional composition packages around Otok core. Core stays free of auth, validation, database, and UI dependencies.

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

Checkout Sessions, webhook signature verification, and a `BillingAdapter` for plan sync. Apps own persistence; Otok core stays free of Stripe.

## Deferred

- OAuth providers — wait for a concrete flow
- General plugin system — explicitly out of scope for Otok core

## Extraction order

1. `@kamod-ch/otok-validate` ✅
2. `otok-auth/adapters/memory` ✅
3. `otok-auth/adapters/kysely` ✅
4. RBAC/tenant middleware in `otok-auth` ✅
5. `otok-flash` ✅
6. `otok-stripe` ✅
