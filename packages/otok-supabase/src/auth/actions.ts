import type { OtokActionContext } from "otok/server";
import { fail, redirect, validationError } from "otok/server";
import { isDataRequest } from "otok/shared";
import { supabaseFromHono } from "../context.js";
import { mapSupabaseError } from "../errors.js";
import type { SupabaseActionResult } from "../types.js";
import { resolveAuthRedirect } from "./redirects.js";

function requireField(formData: FormData | undefined, name: string): string {
  const value = String(formData?.get(name) ?? "").trim();
  if (!value) {
    validationError({ fieldErrors: { [name]: [`${name} is required.`] } });
  }
  return value;
}

function actionRedirectOrJson(c: OtokActionContext, target: string, data?: unknown): SupabaseActionResult {
  if (isDataRequest(c.request)) {
    return { ok: true, data, redirect: target };
  }
  redirect(target, 303);
}

function handleAuthActionError(error: unknown, fallback: string): never {
  const failure = mapSupabaseError(error as { message?: string; status?: number; code?: string }, fallback);
  if (failure.fieldErrors) {
    validationError({ message: failure.message, fieldErrors: failure.fieldErrors }, failure.status === 422 ? 422 : 400);
  }
  fail(failure.status, failure);
}

export interface SupabasePasswordActionOptions {
  successRedirect?: string;
  redirectAllowlist?: readonly string[];
}

export function signInWithPasswordAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const email = requireField(ctx.formData, "email");
    const password = requireField(ctx.formData, "password");
    const supabase = supabaseFromHono(ctx.hono);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) handleAuthActionError(error, "Sign in failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/dashboard",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { user: data.user });
  };
}

export function signUpAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const email = requireField(ctx.formData, "email");
    const password = requireField(ctx.formData, "password");
    const supabase = supabaseFromHono(ctx.hono);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) handleAuthActionError(error, "Sign up failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/dashboard",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { user: data.user });
  };
}

export function sendMagicLinkAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const email = requireField(ctx.formData, "email");
    const supabase = supabaseFromHono(ctx.hono);

    const emailRedirectTo = String(ctx.formData?.get("emailRedirectTo") ?? "").trim() || undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    if (error) handleAuthActionError(error, "Magic link request failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/login?checkEmail=1",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { sent: true });
  };
}

export function requestPasswordResetAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const email = requireField(ctx.formData, "email");
    const supabase = supabaseFromHono(ctx.hono);

    const redirectTo = String(ctx.formData?.get("redirectTo") ?? "").trim() || undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) handleAuthActionError(error, "Password reset request failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/login?resetSent=1",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { sent: true });
  };
}

export function updatePasswordAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const password = requireField(ctx.formData, "password");
    const supabase = supabaseFromHono(ctx.hono);

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) handleAuthActionError(error, "Password update failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/dashboard",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { user: data.user });
  };
}

export function signOutAction(options: SupabasePasswordActionOptions = {}) {
  return async (ctx: OtokActionContext): Promise<SupabaseActionResult> => {
    const supabase = supabaseFromHono(ctx.hono);

    const { error } = await supabase.auth.signOut();
    if (error) handleAuthActionError(error, "Sign out failed.");

    const target = resolveAuthRedirect(
      String(ctx.formData?.get("returnTo") ?? ""),
      options.successRedirect ?? "/login",
      options.redirectAllowlist,
    );
    return actionRedirectOrJson(ctx, target, { signedOut: true });
  };
}
