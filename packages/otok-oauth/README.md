# @kamod-ch/otok-oauth

OAuth login helpers (GitHub and Google) for [Otok](https://github.com/kamod-ch/otok) apps.

This package is **composition, not a plugin**. User persistence stays in your app via an `OAuthAdapter`. Session cookies stay in `@kamod-ch/otok-auth` via an injected `createSession`. Otok core stays free of OAuth dependencies.

## Install

```bash
pnpm add @kamod-ch/otok-oauth arctic hono
# recommended for sessions:
pnpm add @kamod-ch/otok-auth
```

## Quick start

```ts
import { Hono } from "hono";
import { createOAuthFlow } from "@kamod-ch/otok-oauth";
import type { OAuthAdapter } from "@kamod-ch/otok-oauth/adapter";
import { createSessionManager } from "@kamod-ch/otok-auth/session";

type User = { id: string; email: string | null };

const adapter: OAuthAdapter<User> = {
  async findOrCreateUser(profile) {
    // Look up by provider + providerAccountId, or create a local user.
    return { id: "user_1", email: profile.email };
  },
  getUserId: (user) => user.id,
};

const sessions = createSessionManager<User>(
  {
    sessionCookie: "app_session",
    csrfCookie: "app_csrf",
    secure: () => process.env.NODE_ENV === "production",
  },
  /* your SessionAdapter */,
);

const oauth = createOAuthFlow({
  secret: process.env.OAUTH_STATE_SECRET!,
  adapter,
  createSession: sessions.createSession,
  providers: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectUri: process.env.GITHUB_REDIRECT_URI!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    },
  },
});

// With createOtokApp({ configure }):
configure: (app) => {
  oauth.mount(app);
};
```

Registered routes (default `basePath: "/auth"`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/github` | Start GitHub login (`?next=/relative/path` optional) |
| GET | `/auth/github/callback` | GitHub callback |
| GET | `/auth/google` | Start Google login |
| GET | `/auth/google/callback` | Google callback |

On success the flow calls `adapter.findOrCreateUser`, then `createSession`, then redirects to a safe relative `next` path (or `/`).

On failure it redirects to `/login?error=<code>` (override with `loginPath` / `onError`).

## Login UI

Link to the authorize routes from your login page:

```tsx
<a href="/auth/github?next=/studio">Continue with GitHub</a>
<a href="/auth/google?next=/studio">Continue with Google</a>
```

Error codes you may show from `?error=`:

- `invalid_state`
- `missing_code`
- `provider_error`
- `profile_error`
- `adapter_error`
- `provider_unavailable`

## Adapter

```ts
import type { OAuthAdapter, OAuthProfile } from "@kamod-ch/otok-oauth/adapter";

const adapter: OAuthAdapter<User> = {
  async findOrCreateUser(profile: OAuthProfile) {
    // profile.provider: "github" | "google"
    // profile.providerAccountId, email, emailVerified, name, avatarUrl
  },
  getUserId: (user) => user.id,
};
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-oauth` | `createOAuthFlow`, errors, `OAuthProfile` |
| `@kamod-ch/otok-oauth/adapter` | `OAuthAdapter`, `OAuthProfile` |
| `@kamod-ch/otok-oauth/providers/github` | GitHub client helpers |
| `@kamod-ch/otok-oauth/providers/google` | Google client helpers |
| `@kamod-ch/otok-oauth/state` | Signed OAuth state cookie helpers |

## Env vars (app)

```bash
OAUTH_STATE_SECRET=          # min. 32 random bytes
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=         # e.g. http://localhost:3000/auth/github/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=         # e.g. http://localhost:3000/auth/google/callback
```

## Design notes

- Uses [Arctic](https://arcticjs.dev) for provider clients (GitHub authorization code; Google with PKCE).
- State and PKCE verifier are stored in a short-lived signed httpOnly cookie.
- `?next=` is open-redirect safe (same-origin relative paths only).
- Account linking, refresh-token storage, and additional providers are out of scope for v1.
