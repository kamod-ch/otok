# Migration: `@kamod-ch/otok-oauth` 1.0 → 1.1

Version 1.1 adds **Otok plugins** while keeping the composition API from 1.0.

## What changed

| 1.0 (composition) | 1.1 (plugin + composition) |
|-------------------|------------------------------|
| Manual `createOAuthFlow` + `oauth.mount(app)` in `server.ts` | Optional `oauth()` plugin in `otok.config.ts` |
| Manual `createSession` injection | Plugin reads session from `auth()` runtime |
| `safeNextPath(path)` | Same function; optional **redirect allowlist** |
| GitHub + Google | + Microsoft/GitLab extension stubs |
| — | PKCE error code, provider `?error=` handling, account linking |

**Nothing was removed.** Existing `createOAuthFlow` setups continue to work.

## Migrate to plugins

### Before (1.0)

```ts
// server.ts
import { createOAuthFlow } from "@kamod-ch/otok-oauth";
import { createSession } from "./features/auth/session.js";

const oauth = createOAuthFlow({
  secret: process.env.AUTH_SECRET!,
  adapter: oauthAdapter,
  createSession,
  providers: { github: { ... } },
});

configure: (app) => oauth.mount(app),
```

### After (1.1)

```ts
// otok.config.ts
import auth from "@kamod-ch/otok-auth";
import oauth from "@kamod-ch/otok-oauth";

export default defineConfig({
  plugins: [
    auth({
      secret: process.env.AUTH_SECRET!,
      session: { cookieName: "otok_session" },
      adapter: sessionAdapter,
      redirectAllowlist: ["/", "/dashboard"],
    }),
    oauth({
      adapter: oauthAdapter,
      providers: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          redirectUri: `${process.env.APP_URL}/auth/github/callback`,
        },
      },
    }),
  ],
});
```

Remove manual `oauth.mount(app)` from `server.ts` when using the plugin.

## Loader integration (new)

```ts
import { defineLoader } from "@kamod-ch/otok-auth/loader";

export const loader = defineLoader(async ({ auth }) => {
  const user = await auth.requireUser();
  return { user };
});
```

Previously:

```ts
export const loader = ({ hono }) => ({
  user: hono.get("user"),
});
```

Both patterns work; `defineLoader` adds typed helpers and consistent redirects.

## Redirect allowlist

```ts
auth({ redirectAllowlist: ["/", "/dashboard"], ... })
oauth({ redirectAllowlist: ["/", "/dashboard"], ... }) // optional override
```

`/auth/github?next=/evil` off-allowlist paths are ignored (redirect falls back to `/`).

## New error codes

| Code | Meaning |
|------|---------|
| `pkce_error` | Google callback missing PKCE verifier |
| `link_verification_failed` | Account linking without session or `linkAccount` |

## Account linking

```ts
const adapter: OAuthAdapter<User> = {
  findOrCreateUser: ...,
  getUserId: (u) => u.id,
  linkAccount: async ({ user, profile }) => {
    // verify profile, persist provider account id
    return user;
  },
};
```

Start flow: `/auth/github?link=1` (user must be signed in).

## Type-only changes

- `OAuthProviderId` adds `"microsoft" | "gitlab"` (stubs throw until wired)
- `OAuthAdapter.linkAccount` optional
- `OAuthTokenRefreshHandler` optional hook

## Stay on composition

If you prefer manual wiring, keep using:

```ts
import { createOAuthFlow } from "@kamod-ch/otok-oauth";
```

Pass `createSession` from `@kamod-ch/otok-auth/session` as before.
