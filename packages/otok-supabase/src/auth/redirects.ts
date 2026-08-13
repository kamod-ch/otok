import { SupabaseAuthError } from "../errors.js";

const DEFAULT_ALLOWLIST = ["/"] as const;

/**
 * Validates a post-auth redirect target against an allowlist.
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

export function resolveAuthRedirect(
  requested: string | null | undefined,
  fallback: string,
  allowlist: readonly string[] = DEFAULT_ALLOWLIST,
): string {
  const safe = safeRedirectPath(requested, allowlist);
  if (!safe) {
    if (requested) {
      throw new SupabaseAuthError("Unsafe redirect target.", 400);
    }
    return fallback;
  }
  return safe;
}

export function isApiLikeRequest(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) return true;
  if (accept.includes("application/vnd.otok+json")) return true;
  if (request.headers.get("x-otok-data") === "1") return true;
  const requestedWith = request.headers.get("x-requested-with");
  return requestedWith?.toLowerCase() === "xmlhttprequest";
}

export function prefersHtmlResponse(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") || (!isApiLikeRequest(request) && !accept.includes("application/json"));
}
