import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken, sha256 } from "../crypto.js";
import type { SessionAdapter, SessionConfig, SessionManager } from "./types.js";

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 14;

function resolveSecure(c: Context, secure?: boolean | ((c: Context) => boolean)): boolean {
  if (typeof secure === "function") return secure(c);
  if (typeof secure === "boolean") return secure;
  return process.env.NODE_ENV === "production";
}

export function createSessionManager<TUser>(
  config: SessionConfig,
  adapter: SessionAdapter<TUser>,
): SessionManager<TUser> {
  const maxAgeSeconds = config.maxAgeSeconds ?? DEFAULT_MAX_AGE;
  const path = config.path ?? "/";
  const sameSite = config.sameSite ?? "Lax";

  const resolvedConfig: SessionManager<TUser>["config"] = {
    ...config,
    sessionCookie: config.sessionCookie,
    maxAgeSeconds,
  };

  async function createSession(c: Context, userId: string): Promise<void> {
    const token = randomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
    await adapter.createRecord({
      tokenHash,
      userId,
      expiresAt,
      userAgent: c.req.header("user-agent") ?? null,
      ipAddress: null,
    });
    const secure = resolveSecure(c, config.secure);
    setCookie(c, config.sessionCookie, token, {
      httpOnly: true,
      secure,
      sameSite,
      path,
      maxAge: maxAgeSeconds,
    });
    if (config.csrfCookie) {
      setCookie(c, config.csrfCookie, randomToken(), {
        httpOnly: false,
        secure,
        sameSite,
        path,
        maxAge: maxAgeSeconds,
      });
    }
  }

  async function revokeSession(c: Context): Promise<void> {
    const token = getCookie(c, config.sessionCookie);
    if (token) await adapter.revokeRecord(sha256(token));
    deleteCookie(c, config.sessionCookie, { path });
    if (config.csrfCookie) deleteCookie(c, config.csrfCookie, { path });
  }

  async function getSessionUser(c: Context): Promise<TUser | null> {
    const token = getCookie(c, config.sessionCookie);
    if (!token) return null;
    const tokenHash = sha256(token);
    const user = await adapter.resolveUser(tokenHash);
    if (!user) return null;
    await adapter.touchRecord?.(tokenHash);
    return user;
  }

  return {
    createSession,
    revokeSession,
    getSessionUser,
    config: resolvedConfig,
  };
}
