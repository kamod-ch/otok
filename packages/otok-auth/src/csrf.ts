import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { fail } from "otok/server";
import { randomToken } from "./crypto.js";

export const CSRF_FIELD = "_csrf";
export const DEFAULT_CSRF_COOKIE = "otok_csrf";

export interface CsrfOptions {
  cookieName?: string;
  secure?: boolean | ((c: Context) => boolean);
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  maxAge?: number;
}

function resolveSecure(c: Context, secure?: boolean | ((c: Context) => boolean)): boolean {
  if (typeof secure === "function") return secure(c);
  if (typeof secure === "boolean") return secure;
  return process.env.NODE_ENV === "production";
}

export function createCsrfToken(): string {
  return randomToken(24);
}

/** Ensure a CSRF cookie exists on safe requests (GET/HEAD). */
export function ensureCsrfCookie(c: Context, options: CsrfOptions = {}): string {
  const cookieName = options.cookieName ?? DEFAULT_CSRF_COOKIE;
  const existing = getCookie(c, cookieName);
  if (existing) return existing;
  const token = createCsrfToken();
  setCookie(c, cookieName, token, {
    httpOnly: false,
    sameSite: options.sameSite ?? "Lax",
    path: options.path ?? "/",
    secure: resolveSecure(c, options.secure),
    maxAge: options.maxAge,
  });
  return token;
}

export function verifyCsrf(
  c: Context,
  formToken?: string | null,
  options: Pick<CsrfOptions, "cookieName"> = {},
): boolean {
  const cookieName = options.cookieName ?? DEFAULT_CSRF_COOKIE;
  const cookie = getCookie(c, cookieName);
  if (!cookie || !formToken) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(formToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reject mutating form posts when the cookie and form field do not match. */
export function assertCsrf(
  c: Context,
  formData: FormData | undefined,
  options: Pick<CsrfOptions, "cookieName"> = {},
): void {
  const submitted = String(formData?.get(CSRF_FIELD) ?? "");
  if (!verifyCsrf(c, submitted, options)) {
    fail(403, { message: "Invalid CSRF token" });
  }
}

/** Hidden input snippet for progressive-enhancement forms. */
export function csrfHiddenInput(token: string): string {
  return `<input type="hidden" name="${CSRF_FIELD}" value="${token}" />`;
}
