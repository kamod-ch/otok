import type { Context } from "hono";

/** Hono context key for verified cache isolation (auth / tenant / locale middleware). */
export const OTOK_CACHE_SCOPE = "otokCacheScope";

export interface OtokCacheScope {
  /** Verified user id — never derived from client-controlled headers. */
  userId?: string;
  /** Verified tenant id — set only by tenant middleware. */
  tenantId?: string;
  /** Verified locale — set by i18n middleware when it resolves locale. */
  locale?: string;
}

export function setOtokCacheScope(c: Context, scope: OtokCacheScope): void {
  c.set(OTOK_CACHE_SCOPE, scope);
}

export function getOtokCacheScope(c: Context): OtokCacheScope | undefined {
  return c.get(OTOK_CACHE_SCOPE) as OtokCacheScope | undefined;
}

/**
 * Merge middleware scope with the existing `user` context set by auth middleware.
 * Does not read `X-Tenant`, cookies, or other client hints for isolation.
 */
export function resolveOtokCacheScope(c: Context): OtokCacheScope | undefined {
  const fromMiddleware = getOtokCacheScope(c);
  const user = c.get("user" as never) as { id?: string } | undefined;
  const userId = fromMiddleware?.userId ?? (user?.id != null ? String(user.id) : undefined);
  const tenantId = fromMiddleware?.tenantId;
  const locale = fromMiddleware?.locale;

  if (!userId && !tenantId && !locale) return undefined;
  return { userId, tenantId, locale };
}
