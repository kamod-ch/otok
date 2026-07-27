# Auth + GitHub OAuth example

Minimal Otok app using `@kamod-ch/otok-auth` and `@kamod-ch/otok-oauth` plugins.

## Setup

```bash
pnpm install
cp .env.example .env
# Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AUTH_SECRET
pnpm dev
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Public home with GitHub login link |
| `/auth/github` | OAuth authorize (plugin) |
| `/auth/github/callback` | OAuth callback (plugin) |
| `/auth/logout` | Session revoke (auth plugin) |
| `/dashboard` | Protected page via `defineLoader` + `auth.requireUser()` |

See [auth architecture](../../docs/auth-architecture.md) and [OAuth migration guide](../../packages/otok-oauth/MIGRATION.md).
