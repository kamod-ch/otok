# Auth architecture

Otok auth is split into composable packages:

```text
@kamod-ch/otok-auth      — sessions, CSRF, RBAC, redirect safety
@kamod-ch/otok-oauth     — OAuth providers (uses otok-auth sessions)
optional later: otok-better-auth
```

## Design decision: Arctic vs Better Auth

After reviewing the existing implementation, **OAuth protocol handling stays delegated to [Arctic](https://arcticjs.dev/)**:

| Concern | Owner |
|---------|--------|
| Authorization code + PKCE (Google) | Arctic |
| Provider clients (GitHub, Google) | Arctic |
| Signed OAuth `state` cookie | otok-oauth (HMAC-SHA256 via Web Crypto / Node) |
| Session cookies, rotation, CSRF | otok-auth |
| User/account persistence | Your app (`SessionAdapter`, `OAuthAdapter`) |

**Better Auth** is intentionally deferred (`otok-better-auth`). The current stack is small, auditable, and avoids pulling a second persistence model into Otok core. Revisit Better Auth when you need many providers, built-in DB schemas, or admin APIs out of the box.

## Plugin usage

```ts
import { defineConfig } from "otok";
import auth from "@kamod-ch/otok-auth";
import oauth from "@kamod-ch/otok-oauth";
import { createMemorySessionAdapter } from "@kamod-ch/otok-auth/adapters/memory";

export default defineConfig({
  plugins: [
    auth({
      secret: process.env.AUTH_SECRET!,
      session: { cookieName: "otok_session" },
      adapter: createMemorySessionAdapter({ resolveUser: ({ session }) => users.get(session.userId) ?? null }),
      redirectAllowlist: ["/", "/dashboard"],
      getRole: (user) => user.role ?? "member",
    }),
    oauth({
      providers: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          redirectUri: "http://localhost:5173/auth/github/callback",
        },
      },
      adapter: oauthAdapter,
    }),
  ],
});
```

Register **`auth()` before `oauth()`** so session creation is available to OAuth callbacks.

## Server APIs

```ts
import { getSession, requireUser, requireRole } from "@kamod-ch/otok-auth/registry";

app.get("/api/me", async (c) => {
  const user = await requireUser(c);
  return c.json(user);
});
```

## Loaders and actions

```ts
import { defineLoader } from "@kamod-ch/otok-auth/loader";

export const loader = defineLoader(async ({ auth }) => {
  const user = await auth.requireUser();
  return { user };
});
```

`auth()` also sets `c.set("user", …)` on every request so loaders can read `hono.get("user")` without middleware.

## Security properties

- Session cookies: `HttpOnly`, `Secure` (production), `SameSite=Lax`
- CSRF: double-submit cookie for form mutations
- OAuth state: HMAC-signed, 10-minute TTL, single use
- PKCE: required for Google; GitHub uses Arctic classic flow (GitHub OAuth app)
- Redirects: allowlist + relative-path-only (`safeRedirectPath`)
- Errors: structured codes, no token/secret logging

## Extension points

- `@kamod-ch/otok-oauth/providers/microsoft` — Microsoft Entra ID stub
- `@kamod-ch/otok-oauth/providers/gitlab` — GitLab stub
- `OAuthAdapter.linkAccount` — secure account linking (requires active session)
- `OAuthTokenRefreshHandler` — optional refresh token storage

See [`examples/auth-github`](../examples/auth-github) and [`packages/otok-oauth/MIGRATION.md`](../packages/otok-oauth/MIGRATION.md).
