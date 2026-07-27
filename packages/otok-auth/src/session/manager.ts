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

function defaultRotationInterval(maxAgeSeconds: number): number {
  return Math.floor(maxAgeSeconds / 2);
}

export function createSessionManager<TUser>(
  config: SessionConfig,
  adapter: SessionAdapter<TUser>,
): SessionManager<TUser> {
  const maxAgeSeconds = config.maxAgeSeconds ?? DEFAULT_MAX_AGE;
  const path = config.path ?? "/";
  const sameSite = config.sameSite ?? "Lax";
  const rotationIntervalSeconds =
    config.rotationIntervalSeconds ?? defaultRotationInterval(maxAgeSeconds);

  const resolvedConfig: SessionManager<TUser>["config"] = {
    ...config,
    sessionCookie: config.sessionCookie,
    maxAgeSeconds,
    rotationIntervalSeconds,
  };

  function setSessionCookies(c: Context, token: string): void {
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
    setSessionCookies(c, token);
  }

  async function revokeSession(c: Context): Promise<void> {
    const token = getCookie(c, config.sessionCookie);
    if (token) await adapter.revokeRecord(sha256(token));
    deleteCookie(c, config.sessionCookie, { path });
    if (config.csrfCookie) deleteCookie(c, config.csrfCookie, { path });
  }

  async function rotateSession(c: Context): Promise<void> {
    const token = getCookie(c, config.sessionCookie);
    if (!token) return;

    const tokenHash = sha256(token);
    const record = adapter.resolveRecord ? await adapter.resolveRecord(tokenHash) : null;
    if (!record) {
      await revokeSession(c);
      return;
    }

    await adapter.revokeRecord(tokenHash);
    const newToken = randomToken();
    const newHash = sha256(newToken);
    await adapter.createRecord({
      tokenHash: newHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      userAgent: c.req.header("user-agent") ?? null,
      ipAddress: null,
    });
    setSessionCookies(c, newToken);
  }

  async function getSessionUser(c: Context): Promise<TUser | null> {
    const token = getCookie(c, config.sessionCookie);
    if (!token) return null;
    const tokenHash = sha256(token);
    const user = await adapter.resolveUser(tokenHash);
    if (!user) return null;

    if (adapter.resolveRecord) {
      const record = await adapter.resolveRecord(tokenHash);
      if (record) {
        const ageSeconds = (Date.now() - record.createdAt.getTime()) / 1000;
        if (ageSeconds >= rotationIntervalSeconds) {
          await rotateSession(c);
        } else {
          await adapter.touchRecord?.(tokenHash);
        }
      }
    } else {
      await adapter.touchRecord?.(tokenHash);
    }

    return user;
  }

  return {
    createSession,
    revokeSession,
    rotateSession,
    getSessionUser,
    config: resolvedConfig,
  };
}
