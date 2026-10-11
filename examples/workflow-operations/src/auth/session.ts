import { createHmac, timingSafeEqual } from "node:crypto";
import type { OpsPermission, OperatorSession } from "../types.js";

const COOKIE_NAME = "workflow_ops_session";

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: OperatorSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(value: string, secret: string): OperatorSession | null {
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OperatorSession;
    if (!json.operatorId || !Array.isArray(json.permissions)) return null;
    return json;
  } catch {
    return null;
  }
}

export function hasPermission(session: OperatorSession, permission: OpsPermission): boolean {
  return session.permissions.includes(permission);
}

export function parseSessionCookie(cookieHeader: string | undefined, secret: string): OperatorSession | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return decodeSession(decodeURIComponent(match[1]), secret);
}
