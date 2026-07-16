import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { redirect } from "otok/server";
import { seal, unseal } from "./sign.js";
import {
  DEFAULT_FLASH_COOKIE,
  type FlashConfig,
  type FlashMessage,
  type FlashPayload,
  type FlashType,
} from "./types.js";

function resolveSecure(c: Context, secure?: boolean | ((c: Context) => boolean)): boolean {
  if (typeof secure === "function") return secure(c);
  if (typeof secure === "boolean") return secure;
  return process.env.NODE_ENV === "production";
}

function resolveConfig(config: FlashConfig) {
  return {
    secret: config.secret,
    cookieName: config.cookieName ?? DEFAULT_FLASH_COOKIE,
    maxAgeSeconds: config.maxAgeSeconds ?? 120,
    sameSite: config.sameSite ?? "Lax",
    path: config.path ?? "/",
    secure: config.secure,
    contextKey: config.contextKey ?? "flash",
  };
}

function normalizeFlash(input: FlashMessage | string): FlashMessage {
  return typeof input === "string" ? { message: input, type: "info" } : input;
}

function writeFlashCookie(c: Context, payload: FlashPayload, config: FlashConfig): void {
  const resolved = resolveConfig(config);
  const token = seal(JSON.stringify(payload), resolved.secret);
  setCookie(c, resolved.cookieName, token, {
    httpOnly: true,
    sameSite: resolved.sameSite,
    path: resolved.path,
    secure: resolveSecure(c, resolved.secure),
    maxAge: resolved.maxAgeSeconds,
  });
}

export function clearFlash(c: Context, config: Pick<FlashConfig, "cookieName" | "path"> = {}): void {
  const cookieName = config.cookieName ?? DEFAULT_FLASH_COOKIE;
  setCookie(c, cookieName, "", {
    httpOnly: true,
    path: config.path ?? "/",
    maxAge: 0,
  });
}

export function setFlash(c: Context, input: FlashMessage | string, config: FlashConfig): void {
  const flash = normalizeFlash(input);
  writeFlashCookie(
    c,
    {
      message: flash.message,
      type: flash.type ?? "info",
      iat: Date.now(),
    },
    config,
  );
}

export function consumeFlash(c: Context, config: FlashConfig): FlashMessage | undefined {
  const resolved = resolveConfig(config);
  const token = getCookie(c, resolved.cookieName);
  clearFlash(c, { cookieName: resolved.cookieName, path: resolved.path });
  if (!token) return undefined;

  const raw = unseal(token, resolved.secret);
  if (!raw) return undefined;

  let payload: FlashPayload;
  try {
    payload = JSON.parse(raw) as FlashPayload;
  } catch {
    return undefined;
  }

  if (!payload.message || typeof payload.message !== "string") return undefined;
  if (typeof payload.iat !== "number") return undefined;
  if (Date.now() - payload.iat > resolved.maxAgeSeconds * 1000) return undefined;

  return {
    message: payload.message,
    type: payload.type,
  };
}

export function flashRedirect(
  location: string,
  input: FlashMessage | string,
  c: Context,
  config: FlashConfig,
  status: 302 | 303 = 303,
): never {
  setFlash(c, input, config);
  redirect(location, status);
}

export function createFlashType(type: FlashType) {
  return (message: string): FlashMessage => ({ message, type });
}

export const flashSuccess = createFlashType("success");
export const flashError = createFlashType("error");
export const flashWarning = createFlashType("warning");
export const flashInfo = createFlashType("info");

export { DEFAULT_FLASH_COOKIE, type FlashConfig, type FlashMessage, type FlashType };
