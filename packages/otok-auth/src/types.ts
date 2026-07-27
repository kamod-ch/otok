import type { Context } from "hono";
import type { SessionAdapter } from "./session/types.js";

/** Default user shape — extend in your app via generics. */
export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  [key: string]: unknown;
}

export interface AuthSession<TUser extends AuthUser = AuthUser> {
  user: TUser;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface AuthPluginSessionOptions {
  /** Session cookie name. Alias: `cookieName`. */
  cookieName?: string;
  sessionCookie?: string;
  csrfCookie?: string;
  maxAgeSeconds?: number;
  secure?: boolean | ((c: Context) => boolean);
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  /** Rotate session token after this many seconds (default: half of maxAge). */
  rotationIntervalSeconds?: number;
}

export interface AuthPluginOptions<TUser extends AuthUser = AuthUser> {
  session: AuthPluginSessionOptions;
  /** Required for plugin mode — app-owned persistence. */
  adapter: SessionAdapter<TUser>;
  /** HMAC secret for signed payloads (min 32 bytes). Falls back to env AUTH_SECRET. */
  secret?: string;
  contextKey?: string;
  loginPath?: string;
  logoutPath?: string;
  /** Allowed post-login redirect path prefixes (open-redirect safe). */
  redirectAllowlist?: readonly string[];
  /** Role accessor for RBAC helpers. */
  getRole?: (user: TUser) => string;
}
