import { randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function nowUtc(): string {
  return new Date().toISOString();
}

export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim() || "/community";
  if (trimmed === "/") return "";
  return trimmed.replace(/\/+$/, "") || "";
}

export function joinPath(base: string, segment: string): string {
  const b = normalizeBasePath(base);
  const s = segment.startsWith("/") ? segment : `/${segment}`;
  return b ? `${b}${s}` : s;
}

/** Safe redirect — only relative paths on same origin. */
export function safeRedirectPath(location: string, basePath: string): string {
  if (!location.startsWith("/") || location.startsWith("//")) {
    return basePath || "/";
  }
  return location;
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
  };
}

export function offsetForPage(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

/** In-memory rate limit bucket (per-process; replace in production with Redis). */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true };
}

export function resetRateLimitsForTests(): void {
  rateBuckets.clear();
}
