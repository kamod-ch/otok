/** Hono context key set by the Otok handler after route matching (route pattern, not request path). */
export const OTOK_MATCHED_ROUTE_PATTERN_KEY = "otokMatchedRoutePattern";

/** Fixed pathname returned when URL sanitization fails. Never use the raw URL as fallback. */
export const SANITIZE_REQUEST_PATH_FALLBACK = "/[url-unavailable]";

const REDACTED_SEGMENT = ":redacted";

/** Path templates for auth and onboarding flows (query strings are always stripped separately). */
const KNOWN_SENSITIVE_PATHS: ReadonlyArray<{ pattern: RegExp; template: string }> = [
  { pattern: /^\/invite\/[^/]+$/i, template: "/invite/:token" },
  { pattern: /^\/reset-password\/[^/]+$/i, template: "/reset-password/:token" },
  { pattern: /^\/password-reset\/[^/]+$/i, template: "/password-reset/:token" },
  { pattern: /^\/verify-email\/[^/]+$/i, template: "/verify-email/:token" },
  { pattern: /^\/verify\/[^/]+$/i, template: "/verify/:token" },
  { pattern: /^\/magic-link\/[^/]+$/i, template: "/magic-link/:token" },
  { pattern: /^\/auth\/[^/]+\/callback$/i, template: "/auth/:provider/callback" },
];

export interface SanitizeRequestPathOptions {
  /** Otok route pattern (e.g. `/invite/:token`) when available after routing. */
  routePattern?: string;
}

function looksLikeSecretSegment(segment: string): boolean {
  if (segment.length < 8) return false;
  if (/^[0-9a-f]{32,}$/i.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  if (
    segment.length >= 16 &&
    /^[A-Za-z0-9._\-+/=%]+$/.test(segment) &&
    /[A-Za-z]/.test(segment) &&
    /\d/.test(segment)
  ) {
    return true;
  }
  if (segment.length >= 24 && /^[A-Za-z0-9._\-+/=]+$/.test(segment)) return true;
  return false;
}

function normalizeRoutePattern(routePattern: string): string {
  const trimmed = routePattern.trim();
  if (!trimmed || trimmed.includes("://") || trimmed.includes("?") || trimmed.includes("#")) {
    return SANITIZE_REQUEST_PATH_FALLBACK;
  }
  const pathOnly = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutQuery = pathOnly.split("?")[0]?.split("#")[0] ?? pathOnly;
  return withoutQuery || SANITIZE_REQUEST_PATH_FALLBACK;
}

function maskUnknownPathSegments(pathname: string): string {
  const segments = pathname.split("/");
  const masked = segments.map((segment, index) => {
    if (index === 0 || segment === "") return segment;
    return looksLikeSecretSegment(decodeURIComponentSafe(segment)) ? REDACTED_SEGMENT : segment;
  });
  const joined = masked.join("/") || "/";
  return joined.replace(/\/{2,}/g, "/");
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function applyKnownPathTemplate(pathname: string): string | undefined {
  for (const rule of KNOWN_SENSITIVE_PATHS) {
    if (rule.pattern.test(pathname)) return rule.template;
  }
  return undefined;
}

function parsePathname(rawUrl: string): string {
  const parsed = new URL(rawUrl, "http://otok.local");
  if (parsed.username || parsed.password) {
    // Credentials must never influence logged path content.
    parsed.username = "";
    parsed.password = "";
  }
  let pathname = parsed.pathname;
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  return decodeURIComponentSafe(pathname);
}

/**
 * Returns a privacy-safe request path for logs, error reports, and trace attributes.
 * Strips query strings and fragments; never logs URL credentials.
 */
export function sanitizeRequestPath(rawUrl: string, options: SanitizeRequestPathOptions = {}): string {
  try {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      return SANITIZE_REQUEST_PATH_FALLBACK;
    }

    if (options.routePattern) {
      return normalizeRoutePattern(options.routePattern);
    }

    const pathname = parsePathname(rawUrl);
    const known = applyKnownPathTemplate(pathname);
    if (known) return known;

    return maskUnknownPathSegments(pathname);
  } catch {
    return SANITIZE_REQUEST_PATH_FALLBACK;
  }
}
