const DEFAULT_ALLOWLIST = ["/"] as const;

/**
 * Validates a post-login redirect target against an allowlist.
 * Only same-origin relative paths are accepted; `//` and external URLs are rejected.
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  allowlist: readonly string[] = DEFAULT_ALLOWLIST,
): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;

  const allowed = allowlist.length > 0 ? allowlist : DEFAULT_ALLOWLIST;
  const matches = allowed.some((prefix) => {
    if (prefix === "/") return true;
    return raw === prefix || raw.startsWith(`${prefix}/`);
  });

  return matches ? raw : null;
}

/** @deprecated Use `safeRedirectPath`. Kept for backward compatibility. */
export const safeNextPath = safeRedirectPath;
