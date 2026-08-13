import type { EmailOtpType } from "@supabase/supabase-js";
import type { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import { isDataRequest, OTOK_CSRF_FIELD } from "@kamod-ch/otok/shared";
import type { SupabaseAuthRoutesOptions } from "../types.js";
import { mapSupabaseError } from "../errors.js";
import { resolveAuthRedirect, safeRedirectPath } from "./redirects.js";

const DEFAULT_CALLBACK = "/auth/callback";
const DEFAULT_CONFIRM = "/auth/confirm";
const DEFAULT_SIGNOUT = "/auth/signout";

export interface SupabaseAuthRoutes {
  mount(app: Hono): void;
  callback(c: Context): Promise<Response>;
  confirm(c: Context): Promise<Response>;
  signOut(c: Context): Promise<Response>;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function verifySignOutCsrf(c: Context, formData?: FormData): Response | undefined {
  const cookie = getCookie(c, "otok_csrf") ?? getCookie(c, "sb-csrf");
  const submitted = String(formData?.get(OTOK_CSRF_FIELD) ?? c.req.header("x-csrf-token") ?? "");
  if (!cookie || !submitted || !timingSafeEqual(cookie, submitted)) {
    return c.json({ status: 403, message: "Invalid CSRF token" }, 403);
  }
  return undefined;
}

function authFailureResponse(
  c: Context,
  message: string,
  status = 400,
  errorRedirect?: string,
): Response {
  if (isDataRequest(c.req.raw)) {
    return c.json({ status, message }, status as 400);
  }
  const target = safeRedirectPath(errorRedirect ?? "/login", ["/"]) ?? "/login";
  const url = new URL(target, c.req.url);
  url.searchParams.set("error", "auth_failed");
  return c.redirect(`${url.pathname}${url.search}`, 303);
}

export function createSupabaseAuthRoutes(options: SupabaseAuthRoutesOptions = {}): SupabaseAuthRoutes {
  const successRedirect = options.successRedirect ?? "/dashboard";
  const errorRedirect = options.errorRedirect ?? "/login";
  const callbackPath = options.callbackPath ?? DEFAULT_CALLBACK;
  const confirmPath = options.confirmPath ?? DEFAULT_CONFIRM;
  const signOutPath = options.signOutPath ?? DEFAULT_SIGNOUT;
  const allowlist = options.redirectAllowlist ?? ["/", successRedirect, errorRedirect];

  async function callback(c: Context): Promise<Response> {
    const supabase = c.var.supabase;
    const code = c.req.query("code");
    const next = resolveAuthRedirect(c.req.query("next") ?? c.req.query("returnTo"), successRedirect, allowlist);

    if (!code) {
      return authFailureResponse(c, "Missing authorization code.", 400, errorRedirect);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failure = mapSupabaseError(error, "Authentication failed.");
      return authFailureResponse(c, failure.message ?? "Authentication failed.", failure.status, errorRedirect);
    }

    if (isDataRequest(c.req.raw)) {
      return c.json({ redirect: next });
    }
    return c.redirect(next, 303);
  }

  async function confirm(c: Context): Promise<Response> {
    const supabase = c.var.supabase;
    const tokenHash = c.req.query("token_hash");
    const type = c.req.query("type") as EmailOtpType | null;
    const next = resolveAuthRedirect(c.req.query("next"), successRedirect, allowlist);

    if (!tokenHash || !type) {
      return authFailureResponse(c, "Invalid confirmation link.", 400, errorRedirect);
    }

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      const failure = mapSupabaseError(error, "Email confirmation failed.");
      return authFailureResponse(c, failure.message ?? "Email confirmation failed.", failure.status, errorRedirect);
    }

    if (isDataRequest(c.req.raw)) {
      return c.json({ redirect: next });
    }
    return c.redirect(next, 303);
  }

  async function signOut(c: Context): Promise<Response> {
    if (c.req.method !== "POST") {
      return c.json({ status: 405, message: "Method not allowed" }, 405);
    }

    let formData: FormData | undefined;
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      formData = await c.req.formData();
    }
    const csrfFailure = verifySignOutCsrf(c, formData);
    if (csrfFailure) return csrfFailure;

    const supabase = c.var.supabase;
    const { error } = await supabase.auth.signOut();
    if (error) {
      const failure = mapSupabaseError(error, "Sign out failed.");
      return c.json(failure, failure.status as 400);
    }

    const next = resolveAuthRedirect(c.req.query("next"), errorRedirect, allowlist);
    if (isDataRequest(c.req.raw)) {
      return c.json({ redirect: next });
    }
    return c.redirect(next, 303);
  }

  return {
    mount(app) {
      app.get(callbackPath, callback);
      app.get(confirmPath, confirm);
      app.post(signOutPath, signOut);
    },
    callback,
    confirm,
    signOut,
  };
}
