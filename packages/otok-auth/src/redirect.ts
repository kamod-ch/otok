const DEFAULT_ALLOWLIST = ["/"] as const;

const INTERNAL_REDIRECT_BASE = "https://otok.internal";

function redirectHasInvalidChars(raw: string): boolean {
  if (raw.includes("\\")) return true;
  for (let index = 0; index < raw.length; index++) {
    const code = raw.charCodeAt(index);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

function canonicalRelativePath(parsed: URL): string | null {
  const out = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (out.startsWith("//")) return null;
  return out;
}

function normalizedAllowlistPrefix(prefix: string): string | null {
  if (prefix === "/") return "/";
  if (!prefix.startsWith("/") || prefix.startsWith("//")) return null;
  if (redirectHasInvalidChars(prefix)) return null;
  try {
    const parsed = new URL(prefix, INTERNAL_REDIRECT_BASE);
    if (parsed.origin !== new URL(INTERNAL_REDIRECT_BASE).origin) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

function matchesAllowlist(pathname: string, allowlist: readonly string[]): boolean {
  const allowed = allowlist.length > 0 ? allowlist : DEFAULT_ALLOWLIST;
  return allowed.some((rawPrefix) => {
    const prefix = normalizedAllowlistPrefix(rawPrefix);
    if (prefix === null) return false;
    if (prefix === "/") return true;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/**
 * Validates a post-login redirect target against an allowlist.
 * Only same-origin relative paths are accepted; `//` and external URLs are rejected.
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  allowlist: readonly string[] = DEFAULT_ALLOWLIST,
): string | null {
  if (!raw) return null;
  if (redirectHasInvalidChars(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw, INTERNAL_REDIRECT_BASE);
  } catch {
    return null;
  }

  if (parsed.origin !== new URL(INTERNAL_REDIRECT_BASE).origin) return null;

  const canonical = canonicalRelativePath(parsed);
  if (!canonical) return null;

  if (!matchesAllowlist(parsed.pathname, allowlist)) return null;

  return canonical;
}

/** @deprecated Use `safeRedirectPath`. Kept for backward compatibility. */
export const safeNextPath = safeRedirectPath;
