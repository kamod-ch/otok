# @kamod-ch/otok-security

Secure defaults and configurable security middleware for [Otok](https://github.com/kamod-ch/otok).

Uses Hono's `secure-headers`, `cors`, and `body-limit` with Otok-specific host validation, CSRF, redirect protection, and rate-limit hooks.

## Install

```bash
pnpm add @kamod-ch/otok-security hono otok
```

## Plugin setup

```ts
import { defineConfig } from "otok";
import security from "@kamod-ch/otok-security";

export default defineConfig({
  plugins: [
    security({
      trustedHosts: ["example.com", "www.example.com"],
      trustedOrigins: ["https://example.com"],
      cors: {
        origin: ["https://example.com"],
        credentials: true,
      },
      bodyLimit: 2 * 1024 * 1024,
      rateLimit: createMemoryRateLimitProvider({ limit: 100, windowMs: 60_000 }),
    }),
  ],
});
```

## Middleware order

Register `security()` **first** among plugins so headers, CSRF, and body limits apply before auth, i18n, SEO, and SSR:

```ts
plugins: [security(), observability(), i18n(), auth(), seo()]
```

Auth CSRF (`@kamod-ch/otok-auth/csrf`) can replace the built-in CSRF by setting `csrf: false` only in non-production with `strict: false`.

## Secure cookies

```ts
import { secureCookieOptions } from "@kamod-ch/otok-security/cookies";

setCookie(c, "pref", value, secureCookieOptions({ maxAge: 3600 }));
```

Production rejects `secure: false` on cookies.

## Open redirects

```ts
import { safeRedirectTarget } from "@kamod-ch/otok-security/redirect";

return redirect(safeRedirectTarget(nextPath, c));
```

Query params `redirect`, `returnTo`, `next`, and `url` are validated automatically.

## Rate limiting

Implement `RateLimitProvider` for Redis, Cloudflare, or other backends:

```ts
const rateLimit: RateLimitProvider = {
  async check(ctx) {
    // return { allowed: false, retryAfterSeconds: 30 }
    return { allowed: true, limit: 100, remaining: 99 };
  },
};
```

## Defaults

| Feature | Development | Production |
|---------|-------------|------------|
| Secure headers | on | on |
| CSP | baseline restrictive | on (required) |
| CSRF | on when enabled | on (required) |
| Body limit | 1 MB | 1 MB |
| Secure cookies | off unless HTTPS | secure |

Disabling CSP or CSRF in production throws unless `strict: false`.

## API

| Export | Purpose |
|--------|---------|
| `security()` | Plugin factory |
| `configureSecurityApp` | Manual Hono wiring |
| `createSecurityCsrfMiddleware` | Standalone CSRF |
| `createOpenRedirectGuard` | Query param redirect guard |
| `createMemoryRateLimitProvider` | Dev/test rate limiter |
| `secureCookieOptions` | Safe cookie defaults |
