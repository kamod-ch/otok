import type { Context } from "hono";
import type { AuthHelpers } from "./context.js";
import type { SessionManager } from "./session/types.js";
import type { AuthUser } from "./types.js";

export interface AuthRuntime<TUser extends AuthUser = AuthUser> {
  sessions: SessionManager<TUser>;
  helpers: AuthHelpers<TUser>;
  contextKey: string;
  loginPath: string;
  logoutPath: string;
  redirectAllowlist: readonly string[];
}

let runtime: AuthRuntime | null = null;

/** @internal Test helper */
export function resetAuthRuntimeForTests(): void {
  runtime = null;
}

export function registerAuthRuntime<TUser extends AuthUser>(value: AuthRuntime<TUser>): void {
  runtime = value as AuthRuntime;
}

export function getAuthRuntime<TUser extends AuthUser = AuthUser>(): AuthRuntime<TUser> {
  if (!runtime) {
    throw new Error(
      "otok-auth: no auth runtime registered. Add auth() to otok.config.ts plugins or call registerAuthRuntime().",
    );
  }
  return runtime as AuthRuntime<TUser>;
}

export function tryGetAuthRuntime<TUser extends AuthUser = AuthUser>(): AuthRuntime<TUser> | null {
  return runtime as AuthRuntime<TUser> | null;
}

/** Convenience for API routes outside the plugin registry. */
export async function getSession<TUser extends AuthUser = AuthUser>(
  c: Context,
): Promise<TUser | null> {
  return getAuthRuntime<TUser>().helpers.getSession(c);
}

export async function requireUser<TUser extends AuthUser = AuthUser>(c: Context): Promise<TUser> {
  return getAuthRuntime<TUser>().helpers.requireUser(c);
}

export async function requireRole<TUser extends AuthUser = AuthUser>(
  c: Context,
  role: string,
): Promise<TUser> {
  return getAuthRuntime<TUser>().helpers.requireRole(c, role);
}
