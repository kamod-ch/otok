# @kamod-ch/otok-auth

Cookie sessions, CSRF, and route middleware helpers for [Otok](https://github.com/kamod-ch/otok) apps.

Ships as an **Otok plugin** (`auth()`) and as **composition helpers** for manual wiring.

## Install

```bash
pnpm add @kamod-ch/otok-auth hono otok
```

## Plugin (recommended)

```ts
import { defineConfig } from "otok";
import auth from "@kamod-ch/otok-auth";
import { createMemorySessionAdapter } from "@kamod-ch/otok-auth/adapters/memory";

export default defineConfig({
  plugins: [
    auth({
      secret: process.env.AUTH_SECRET!,
      session: { cookieName: "otok_session" },
      adapter: createMemorySessionAdapter({ resolveUser: ({ session }) => users.get(session.userId) ?? null }),
      redirectAllowlist: ["/", "/dashboard"],
      getRole: (user) => user.role,
    }),
  ],
});
```

## Loaders

```ts
import { defineLoader } from "@kamod-ch/otok-auth/loader";

export const loader = defineLoader(async ({ auth }) => {
  const user = await auth.requireUser();
  return { user };
});
```

## Server APIs

```ts
import { getSession, requireUser, requireRole } from "@kamod-ch/otok-auth/registry";
```

## Composition (manual wiring)

This package remains **composition-friendly**. Database schema and user lookup stay in your app via a `SessionAdapter`.


```ts
import { createSessionManager, type SessionAdapter } from "@kamod-ch/otok-auth/session";

type User = { id: string; email: string };

const adapter: SessionAdapter<User> = {
  async createRecord(input) { /* persist tokenHash + userId */ },
  async revokeRecord(tokenHash) { /* mark revoked */ },
  async resolveUser(tokenHash) { /* return user or null */ },
};

const sessions = createSessionManager<User>(
  {
    sessionCookie: "app_session",
    csrfCookie: "app_csrf",
    maxAgeSeconds: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === "production",
  },
  adapter,
);

export const { createSession, revokeSession, getSessionUser } = sessions;
```

## Route middleware

```ts
// src/app/routes/_middleware.ts
import { createRequireAuthMiddleware } from "@kamod-ch/otok-auth/middleware";
import { getSessionUser } from "../features/auth/session.js";

export default createRequireAuthMiddleware({
  getUser: getSessionUser,
  publicPaths: ["/login"],
  onAuthenticated: (c, user) => {
    c.set("user", user);
  },
});
```

## Tenant and role middleware

Compose auth with tenant context and optional RBAC:

```ts
import {
  composeMiddleware,
  createRequireAuthMiddleware,
  createRequireRoleMiddleware,
  createTenantMiddleware,
} from "@kamod-ch/otok-auth/middleware";

export default composeMiddleware(
  createRequireAuthMiddleware({ getUser: getSessionUser, publicPaths: ["/login"] }),
  createTenantMiddleware({
    getTenantId: (user) => user.organizationId,
    contextKey: "organizationId",
    also: { role: (user) => user.role },
  }),
  createRequireRoleMiddleware({
    getRole: (user) => user.role,
    allowed: ["owner", "admin"],
  }),
);
```

## CSRF

```ts
import { createCsrfMiddleware } from "@kamod-ch/otok-auth/middleware";
import { ensureCsrfCookie, CSRF_FIELD } from "@kamod-ch/otok-auth/csrf";

// Option A: dedicated middleware
export default createCsrfMiddleware({ cookieName: "app_csrf" });

// Option B: hidden field in forms
<input type="hidden" name={CSRF_FIELD} value={ensureCsrfCookie(c)} />
```

## API guard (`configure()`)

Route `_middleware.ts` does **not** run for Hono routes registered via `createOtokApp({ configure })`. Use `createApiGuard`:

```ts
import { createApiGuard } from "@kamod-ch/otok-auth/middleware";

const requireApiUser = createApiGuard(getSessionUser);

configure: (app) => {
  app.get("/api/me", async (c) => {
    const user = await requireApiUser(c);
    if (!user) return c.json({ error: { code: "unauthorized" } }, 401);
    return c.json(user);
  });
};
```

## Password helpers

```ts
import { hashPassword, verifyPassword } from "@kamod-ch/otok-auth/password";
```

Requires peer dependency `@node-rs/argon2`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-auth` | Re-exports |
| `@kamod-ch/otok-auth/session` | Session manager + types |
| `@kamod-ch/otok-auth/middleware` | Auth, CSRF, tenant context, RBAC, `composeMiddleware` |
| `@kamod-ch/otok-auth/csrf` | CSRF cookie/field helpers |
| `@kamod-ch/otok-auth/password` | Argon2 hash/verify |
| `@kamod-ch/otok-auth/adapters/memory` | In-memory/file-backed session adapter |
| `@kamod-ch/otok-auth/adapters/kysely` | Kysely session CRUD adapter |

## Memory session adapter

For dev, tests, or file-backed prototypes:

```ts
import { createMemorySessionAdapter } from "@kamod-ch/otok-auth/adapters/memory";

const adapter = createMemorySessionAdapter<User>({
  resolveUser: ({ session }) => users.get(session.userId) ?? null,
  persistence: {
    load: () => readSessionsFromDisk(),
    save: (sessions) => writeSessionsToDisk(sessions),
  },
});
```

`resolveUser` stays app-specific. The adapter handles session CRUD, expiry, revoke, and touch.

## Kysely session adapter

For Postgres/SQLite apps using Kysely:

```ts
import { createKyselySessionAdapter } from "@kamod-ch/otok-auth/adapters/kysely";

const adapter = createKyselySessionAdapter<User>({
  db,
  table: "appSession",
  resolveUser: async (tokenHash) => {
    return db
      .selectFrom("appSession")
      .innerJoin("appUser", "appUser.id", "appSession.userId")
      .select(["appUser.id", "appUser.email"])
      .where("appSession.tokenHash", "=", tokenHash)
      .where("appSession.revokedAt", "is", null)
      .where("appSession.expiresAt", ">", new Date())
      .executeTakeFirst();
  },
});
```

A reference SQL migration is exported as `SESSION_TABLE_MIGRATION_SQL`.
