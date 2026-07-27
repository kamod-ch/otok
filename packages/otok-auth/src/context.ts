import type { Context } from "hono";
import { redirect } from "otok/server";
import { AuthError } from "./errors.js";
import { safeRedirectPath } from "./redirect.js";
import type { SessionManager } from "./session/types.js";
import type { AuthSession, AuthUser } from "./types.js";

export interface AuthHelpersOptions<TUser extends AuthUser> {
  sessions: SessionManager<TUser>;
  contextKey?: string;
  loginPath?: string;
  redirectAllowlist?: readonly string[];
  getRole?: (user: TUser) => string;
}

export interface AuthHelpers<TUser extends AuthUser = AuthUser> {
  getSession(c: Context): Promise<TUser | null>;
  requireUser(c: Context): Promise<TUser>;
  requireRole(c: Context, role: string): Promise<TUser>;
  safeRedirect(raw: string | null | undefined): string | null;
  createSession(c: Context, userId: string): Promise<void>;
  revokeSession(c: Context): Promise<void>;
  rotateSession(c: Context): Promise<void>;
}

export function createAuthHelpers<TUser extends AuthUser>(
  options: AuthHelpersOptions<TUser>,
): AuthHelpers<TUser> {
  const contextKey = options.contextKey ?? "user";
  const loginPath = options.loginPath ?? "/login";
  const redirectAllowlist = options.redirectAllowlist ?? ["/"];

  async function getSession(c: Context): Promise<TUser | null> {
    const cached = c.get(contextKey) as TUser | undefined;
    if (cached) return cached;
    const user = await options.sessions.getSessionUser(c);
    if (user) c.set(contextKey, user);
    return user;
  }

  async function requireUser(c: Context): Promise<TUser> {
    const user = await getSession(c);
    if (!user) redirect(loginPath, 303);
    return user;
  }

  async function requireRole(c: Context, role: string): Promise<TUser> {
    const user = await requireUser(c);
    if (!options.getRole) {
      throw new AuthError("forbidden", "Role checks are not configured");
    }
    const userRole = options.getRole(user);
    if (userRole !== role) {
      throw new AuthError("forbidden", "Insufficient permissions");
    }
    return user;
  }

  return {
    getSession,
    requireUser,
    requireRole,
    safeRedirect: (raw) => safeRedirectPath(raw, redirectAllowlist),
    createSession: (c, userId) => options.sessions.createSession(c, userId),
    revokeSession: (c) => options.sessions.revokeSession(c),
    rotateSession: (c) => options.sessions.rotateSession(c),
  };
}

/** Build typed session metadata from a resolved user (optional helper). */
export function toAuthSession<TUser extends AuthUser>(
  user: TUser,
  getUserId: (user: TUser) => string,
  expiresAt: Date,
): AuthSession<TUser> {
  return {
    user,
    userId: getUserId(user),
    issuedAt: new Date(),
    expiresAt,
  };
}

/** Read user from Hono context (set by auth middleware or helpers). */
export function readContextUser<TUser extends AuthUser = AuthUser>(
  c: Context,
  contextKey = "user",
): TUser | undefined {
  return c.get(contextKey) as TUser | undefined;
}

/** Helpers bound to a single request context (for loaders/actions). */
export interface AuthBoundHelpers<TUser extends AuthUser = AuthUser> {
  getSession(): Promise<TUser | null>;
  requireUser(): Promise<TUser>;
  requireRole(role: string): Promise<TUser>;
  safeRedirect(raw: string | null | undefined): string | null;
  createSession(userId: string): Promise<void>;
  revokeSession(): Promise<void>;
  rotateSession(): Promise<void>;
}

export function authFromOtokContext<TUser extends AuthUser = AuthUser>(
  hono: Context,
  helpers: AuthHelpers<TUser>,
): AuthBoundHelpers<TUser> {
  return {
    getSession: () => helpers.getSession(hono),
    requireUser: () => helpers.requireUser(hono),
    requireRole: (role) => helpers.requireRole(hono, role),
    safeRedirect: helpers.safeRedirect,
    createSession: (userId) => helpers.createSession(hono, userId),
    revokeSession: () => helpers.revokeSession(hono),
    rotateSession: () => helpers.rotateSession(hono),
  };
}
