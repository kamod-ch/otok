/**
 * Double-submit CSRF cookie utility for cookie-authenticated Otok apps.
 * This is intentionally an app-layer recipe — Otok core does not enforce CSRF.
 */
import { createHash, randomBytes } from "node:crypto";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { fail } from "otok/server";

export const CSRF_COOKIE = "otok_csrf";
export const CSRF_FIELD = "_csrf";

export function createCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/** Ensure a CSRF cookie exists on safe requests (GET/HEAD). */
export function ensureCsrfCookie(c: Context): string {
  const existing = getCookie(c, CSRF_COOKIE);
  if (existing) return existing;
  const token = createCsrfToken();
  setCookie(c, CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "Lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

/** Reject mutating form posts when the cookie and form field do not match. */
export function assertCsrf(c: Context, formData: FormData | undefined): void {
  const cookie = getCookie(c, CSRF_COOKIE);
  const submitted = String(formData?.get(CSRF_FIELD) ?? "");
  if (!cookie || !submitted || cookie !== submitted) {
    fail(403, { message: "Invalid CSRF token" });
  }
}

/** Hidden input snippet for progressive-enhancement forms. */
export function csrfHiddenInput(token: string): string {
  return `<input type="hidden" name="${CSRF_FIELD}" value="${token}" />`;
}
