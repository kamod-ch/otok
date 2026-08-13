import { createMiddleware } from "hono/factory";
import type { Context, MiddlewareHandler } from "hono";
import { isDataRequest } from "@kamod-ch/otok/shared";
import type {
  RequireSupabaseAuthOptions,
  RequireSupabaseUserOptions,
  SupabaseAuthClaimsEnv,
  SupabaseAuthFullEnv,
  SupabaseAuthUserEnv,
} from "../types.js";
import { mapSupabaseError } from "../errors.js";
import { isApiLikeRequest, prefersHtmlResponse, resolveAuthRedirect, safeRedirectPath } from "./redirects.js";

function resolveRedirectTarget(
  c: Context,
  options: RequireSupabaseAuthOptions,
): string {
  const requested = c.req.query("returnTo") ?? c.req.query("next");
  const fallback = options.redirectTo ?? "/login";
  return resolveAuthRedirect(requested, fallback, options.redirectAllowlist);
}

function handleUnauthenticated(c: Context, options: RequireSupabaseAuthOptions): Response {
  const request = c.req.raw;
  const responseMode = options.response ?? (prefersHtmlResponse(request) ? "redirect" : "json");
  const redirectTarget = resolveRedirectTarget(c, options);

  if (responseMode === "redirect" && !isApiLikeRequest(request) && !isDataRequest(request)) {
    const location = safeRedirectPath(redirectTarget, options.redirectAllowlist ?? ["/"]) ?? "/login";
    return c.redirect(location, 303);
  }

  return c.json({ status: 401, message: "Authentication required." }, 401);
}

export function requireSupabaseAuth<Database = unknown>(
  options: RequireSupabaseAuthOptions = {},
): MiddlewareHandler<SupabaseAuthClaimsEnv<Database>> {
  return createMiddleware<SupabaseAuthClaimsEnv<Database>>(async (c, next) => {
    const supabase = c.var.supabase;
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
      return handleUnauthenticated(c, options);
    }

    c.set("supabaseClaims", data.claims);
    await next();
  });
}

export function requireSupabaseUser<Database = unknown>(
  options: RequireSupabaseUserOptions = {},
): MiddlewareHandler<SupabaseAuthUserEnv<Database>> {
  return createMiddleware<SupabaseAuthUserEnv<Database>>(async (c, next) => {
    const supabase = c.var.supabase;
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const failure = mapSupabaseError(error, "Authentication required.");
      if (failure.status === 401) {
        return handleUnauthenticated(c, options);
      }
      return c.json(failure, failure.status as 400);
    }

    if (!data.user) {
      return handleUnauthenticated(c, options);
    }

    c.set("supabaseUser", data.user);
    await next();
  });
}

export function requireSupabaseAuthAndUser<Database = unknown>(
  options: RequireSupabaseUserOptions = {},
): MiddlewareHandler<SupabaseAuthFullEnv<Database>> {
  return createMiddleware<SupabaseAuthFullEnv<Database>>(async (c, next) => {
    const supabase = c.var.supabase;
    const claimsResult = await supabase.auth.getClaims();
    if (claimsResult.error || !claimsResult.data?.claims) {
      return handleUnauthenticated(c, options);
    }
    c.set("supabaseClaims", claimsResult.data.claims);

    const userResult = await supabase.auth.getUser();
    if (userResult.error) {
      const failure = mapSupabaseError(userResult.error, "Authentication required.");
      return c.json(failure, failure.status as 400);
    }
    if (!userResult.data.user) {
      return handleUnauthenticated(c, options);
    }
    c.set("supabaseUser", userResult.data.user);
    await next();
  });
}

export { safeRedirectPath, resolveAuthRedirect, isApiLikeRequest, prefersHtmlResponse } from "./redirects.js";
