# with-supabase

Minimal Otok example using `@kamod-ch/otok-supabase` for cookie-based Supabase Auth.

## Setup

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Apply `supabase/migrations/20260101000000_example_schema.sql` in the Supabase SQL editor.
3. Enable Email auth (password + magic link) in the Supabase dashboard.
4. Set redirect URLs to `http://localhost:5173/auth/callback` and `/auth/confirm`.
5. Configure `otok.config.ts` — the `supabase()` plugin mounts middleware and auth routes automatically.
6. Install and run:

```bash
pnpm install
pnpm dev
```

### Plugin configuration

The example uses the Otok plugin factory:

```typescript
import supabase from "@kamod-ch/otok-supabase";

export default defineConfig({
  plugins: [
    supabase({
      url: process.env.SUPABASE_URL!,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      authRoutes: { successRedirect: "/dashboard", errorRedirect: "/login" },
    }),
  ],
});
```

For manual middleware wiring without the plugin, use `@kamod-ch/otok-supabase/server` instead.

## Features demonstrated

- Server middleware with typed `c.var.supabase`
- Protected dashboard route via `requireSupabaseUser()`
- Password login and magic link actions
- Auth callback / confirm / sign-out routes
- RLS-protected `projects` query

Generate typed database definitions:

```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > src/database.types.ts
```
