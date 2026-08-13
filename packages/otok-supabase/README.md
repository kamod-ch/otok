# @kamod-ch/otok-supabase

Production-ready Supabase integration for [Otok](https://github.com/kamod-ch/otok) apps: SSR cookie sessions, PKCE, typed Hono middleware, auth routes, and optional route actions.

> **Naming:** This repository publishes extensions as `@kamod-ch/otok-*`. The requested `@otok/supabase` name maps to **`@kamod-ch/otok-supabase`**.

## 1. Purpose and boundaries

This package solves Otok-specific integration concerns only:

- Request/response cookie wiring for `@supabase/ssr`
- Per-request SSR clients
- Typed Hono context (`c.var.supabase`)
- Auth middleware (`getClaims` / `getUser`)
- Callback, email confirmation, and sign-out routes
- Safe redirects and Otok-compatible error mapping

It does **not** wrap Supabase queries, Realtime, Storage, or billing. Use `@supabase/supabase-js` directly through the provided clients.

## 2. Installation

```bash
pnpm add @kamod-ch/otok-supabase @supabase/supabase-js
```

Peer dependencies: `otok`, `hono`, `@supabase/supabase-js`.

## 3. Prepare your Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Enable Email auth (password and/or magic link).
3. Add site URL and redirect URLs for `/auth/callback` and `/auth/confirm`.
4. Apply RLS policies for your tables (see example migration in `examples/with-supabase`).

## 4. Environment variables

Read env in your app and pass values explicitly:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

Never expose the service role key to the browser.

## 5. Server middleware

### Otok plugin (recommended)

```typescript
import { defineConfig } from "otok";
import supabase from "@kamod-ch/otok-supabase";

export default defineConfig({
  plugins: [
    supabase<Database>({
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      cookieOptions: { path: "/", sameSite: "lax", secure: true },
      authRoutes: {
        successRedirect: "/dashboard",
        errorRedirect: "/login",
        redirectAllowlist: ["/", "/dashboard"],
      },
    }),
  ],
});
```

The plugin mounts SSR middleware and auth routes via `configureApp`. For loaders, use `@kamod-ch/otok-supabase/loader`:

```typescript
import { defineLoader } from "@kamod-ch/otok-supabase/loader";

export const loader = defineLoader<Database>(async ({ supabase }) => {
  const { data } = await supabase.from("projects").select("*");
  return { projects: data ?? [] };
});
```

### Manual Hono middleware

```typescript
import { supabase } from "@kamod-ch/otok-supabase/server";
import type { Database } from "./database.types";

const app = new Hono();

app.use(
  "*",
  supabase<Database>({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    cookieOptions: { path: "/", sameSite: "lax", secure: true },
  }),
);

app.get("/projects", async (c) => {
  const { data, error } = await c.var.supabase.from("projects").select("*");
  if (error) throw error;
  return c.json(data);
});
```

In Otok apps, mount the same middleware in `createOtokApp({ configure })` — see `examples/with-supabase`.

## 6. Browser client

```typescript
import { createOtokSupabaseBrowserClient } from "@kamod-ch/otok-supabase/browser";

const supabase = createOtokSupabaseBrowserClient<Database>({
  url: import.meta.env.SUPABASE_URL,
  publishableKey: import.meta.env.SUPABASE_PUBLISHABLE_KEY,
});
```

Call only in the browser (not at module import time on the server).

## 7. Protect routes

### Fast JWT check — `getClaims()`

```typescript
import { requireSupabaseAuth } from "@kamod-ch/otok-supabase/auth";

app.use("/dashboard/*", requireSupabaseAuth({ redirectTo: "/login" }));
app.get("/dashboard", (c) => c.json({ sub: c.var.supabaseClaims.sub }));
```

### Auth-server user — `getUser()`

```typescript
import { requireSupabaseUser } from "@kamod-ch/otok-supabase/auth";

app.use("/account/*", requireSupabaseUser({ response: "json" }));
```

## 8. Callback routes

```typescript
import { createSupabaseAuthRoutes } from "@kamod-ch/otok-supabase/auth";

createSupabaseAuthRoutes({
  successRedirect: "/dashboard",
  errorRedirect: "/login",
  redirectAllowlist: ["/", "/dashboard", "/login"],
}).mount(app);
```

Routes: `GET /auth/callback`, `GET /auth/confirm`, `POST /auth/signout`.

## 9. Magic link

Use `sendMagicLinkAction()` in a route action or call `supabase.auth.signInWithOtp()` from your own form handler. Configure `emailRedirectTo` to your callback/confirm URLs in Supabase.

## 10. Generate database types

```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > src/database.types.ts
```

## 11. Row Level Security

Always enable RLS on user-facing tables. The example migration in `examples/with-supabase/supabase/migrations/` demonstrates profiles, projects, and project_members policies.

## 12. Admin client

```typescript
import { createOtokSupabaseAdminClient } from "@kamod-ch/otok-supabase/admin";

const admin = createOtokSupabaseAdminClient<Database>({
  url: env.SUPABASE_URL,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
});
```

**Server only.** Bypasses RLS — never import from the root or browser entry points.

## 13. Node deployment

Pass env vars to your Node/Bun adapter as with any Otok app. Middleware uses standard Web APIs (`Headers`, `Request`, `Response`) — no Node-only cookie APIs.

## 14. Cloudflare Workers

Pass `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from Worker bindings into `supabase(config)` in your fetch handler or Otok Cloudflare adapter `configure` hook.

## 15. Bun

Same as Node — explicit config object, no `process.env` inside the library.

## 16. Troubleshooting

| Symptom | Check |
|---------|--------|
| Random logouts | Ensure `supabase()` middleware runs on every request with `getAll` + `setAll` |
| Redirect loops | Verify `redirectAllowlist` includes post-login targets |
| 401 on API routes | Set `Accept: application/json` or use `response: "json"` |
| CSRF on sign-out | Include `_csrf` field matching `otok_csrf` cookie |

## 17. Security checklist

- [ ] Publishable key only in browser/SSR client config
- [ ] Service role key only in server/admin code
- [ ] RLS enabled on all public tables
- [ ] Redirect allowlist configured
- [ ] HTTPS + `secure` cookies in production
- [ ] Sign-out uses POST + CSRF

## 18. `getClaims` vs `getUser` vs `getSession`

| Method | Use for |
|--------|---------|
| `getClaims()` | Fast route guards — local JWT verification (JWKS for asymmetric keys) |
| `getUser()` | Sensitive operations needing Auth-server confirmation |
| `getSession()` | Cookie refresh inside middleware only — **not** authorization |

## 19. Working with `@kamod-ch/otok-oauth`

Use OAuth for social login and Supabase for database/auth as separate layers, or map OAuth users into Supabase via admin API. Do not mix session cookies without a clear bridge strategy.

## 20. `@supabase/ssr` caveats

- Always implement both `getAll` and `setAll` when response headers can be set
- Apply cache headers from `setAll` to prevent CDN session leakage
- Cookie API is encapsulated in this package — pin versions and run tests when upgrading `@supabase/ssr`

## API exports

| Entry | Exports |
|-------|---------|
| `.` | Config validation, errors, types, server middleware |
| `./server` | `createOtokSupabaseServerClient`, cookie helpers |
| `./browser` | `createOtokSupabaseBrowserClient` |
| `./auth` | Middleware, routes, actions, redirects |
| `./admin` | `createOtokSupabaseAdminClient` |
| `./storage` | `getSupabaseStorage` — Storage entry point |
| `./plugin` | Plugin factory (same as root default export) |
| `./registry` | Runtime registry helpers |
| `./loader` | `defineLoader` / `defineAction` with `supabase` injection |

## License

MIT
