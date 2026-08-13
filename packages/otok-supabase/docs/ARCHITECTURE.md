# Architecture: `@kamod-ch/otok-supabase`

## Package naming

The repository publishes extensions as **`@kamod-ch/otok-*`** (for example `@kamod-ch/otok-auth`, `@kamod-ch/otok-stripe`). The requested name `@otok/supabase` is therefore implemented as **`@kamod-ch/otok-supabase`**. The legacy `@otok/*` scope remains available only for registry aliases in `@kamod-ch/otok-registry`.

## Scope

This package is a thin Otok/Hono integration layer over:

- `@supabase/supabase-js`
- `@supabase/ssr`

It does **not** re-implement Supabase Auth, query builders, Realtime, or Storage. All `@supabase/ssr` cookie handling is encapsulated in `src/server/cookies.ts` so upstream API changes can be absorbed in one place.

## Context typing

Otok route handlers historically use `c.set()` / `context.hono.get()`. For middleware-first Supabase access the package uses **Hono typed variables** via `createMiddleware`, exposing:

- `c.var.supabase`
- `c.var.supabaseClaims` (after `requireSupabaseAuth()`)
- `c.var.supabaseUser` (after `requireSupabaseUser()`)

This matches the user-facing API while remaining compatible with Otok's `defineMiddleware` route guards.

## Runtime model

| Entry | Purpose |
|-------|---------|
| `.` | Shared config, errors, server middleware re-exports |
| `./server` | SSR client + cookie adapter |
| `./browser` | Browser client singleton |
| `./auth` | Auth middleware, routes, actions |
| `./admin` | Service-role client (server-only) |

Configuration is **explicit** — no `process.env` reads inside core functions. Applications pass env values from Node, Bun, Cloudflare bindings, or Deno.

## Auth strategy

- **PKCE + cookies** via `@supabase/ssr` `createServerClient`
- **`getClaims()`** for fast route protection (JWT signature / expiry)
- **`getUser()`** when Auth-server confirmation is required
- **`getSession()`** only used internally for cookie refresh in middleware — not for authorization decisions

## Otok error model

Otok uses `OtokFailure` / `OtokHttpError`, not a separate `OtokError` class. `mapSupabaseError()` returns `OtokFailure`. Route **actions** may throw via `fail()` / `validationError()` / `redirect()`; Hono **middleware** returns `Response` objects for redirects and JSON errors so plain Hono apps and Otok SSR both behave correctly.

## Deferred (post-MVP)

- Kamod UI auth form components — belong in examples / UI kits
- Automatic Supabase project creation / Management API
- Advanced Storage helpers (signed URL policies, upload middleware)
- Advanced Realtime helpers (SSR-safe subscription lifecycle), not the core package
