# HTML response cache (server)

Otok can cache fully rendered HTML for GET routes when `defineRendering({ cache: { … } })` enables it.

## Security model (0.6.2+)

- **Shared cache** is only used for anonymous requests (no session/auth cookies, no `user` context).
- **`Cache-Control: private`** affects browsers and CDNs only; it does **not** isolate entries in the in-process/shared provider.
- **Per-user / per-tenant** server caching requires a **verified scope** via `setOtokCacheScope()` and/or the authenticated `user` id already attached by auth middleware. Client headers such as `X-Tenant` are **not** used for cache keys.
- **`noStore`** skips both read and write on the server HTML cache.
- Responses with **`Set-Cookie`** or **status ≥ 400** are never stored.
- **`Vary: *`** (or `vary: ["*"]` in config) disables server HTML caching for that route.
- **`stale-while-revalidate`** is emitted on `Cache-Control` for downstream caches; the built-in HTML provider only serves **fresh** entries and recomputes synchronously after `maxAge`.

## Configuration

```ts
import { setOtokCacheScope } from "otok/server";

app.use("*", async (c, next) => {
  const tenant = resolveTenantFromSession(c); // your verified logic
  if (tenant) setOtokCacheScope(c, { tenantId: tenant.id });
  await next();
});
```

Use `vary: ["Accept-Language"]` (or other headers) when content depends on request headers; values are taken from the incoming request with normalized header names.

## Key versioning

Cache keys are prefixed with `v1|`. Changing key semantics bumps `CACHE_KEY_VERSION` in `@kamod-ch/otok/cache`, invalidating prior provider entries.
