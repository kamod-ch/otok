import type { Context } from "hono";
import { defineMiddleware, type OtokMiddleware } from "@kamod-ch/otok/server";
import type { OpenRedirectOptions } from "./types.js";

const DEFAULT_PARAMS = ["redirect", "returnTo", "next", "url", "return", "continue"];

function redirectHasInvalidChars(target: string): boolean {
  if (target.includes("\\")) return true;
  for (let index = 0; index < target.length; index++) {
    const code = target.charCodeAt(index);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

function canonicalSafeRedirect(target: string, origin: string): string | null {
  if (!target || redirectHasInvalidChars(target)) return null;

  try {
    const base = new URL(origin);
    const parsed = new URL(target, origin);

    if (parsed.username || parsed.password) return null;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.origin !== base.origin) return null;

    const isRootRelative = target.startsWith("/") && !target.startsWith("//");
    if (isRootRelative) {
      const relative = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (relative.startsWith("//")) return null;
      return relative;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

function isSafeRedirect(target: string, origin: string): boolean {
  return canonicalSafeRedirect(target, origin) !== null;
}

export function createOpenRedirectGuard(options: OpenRedirectOptions = {}): OtokMiddleware {
  const params = options.params ?? DEFAULT_PARAMS;

  return defineMiddleware(async (c, next) => {
    const url = new URL(c.req.url);
    for (const name of params) {
      const value = url.searchParams.get(name);
      if (value && !isSafeRedirect(value, url.origin)) {
        return c.text("Invalid redirect target", 400);
      }
    }
    await next();
  });
}

/** Validate a redirect URL before sending a Location header. */
export function safeRedirectTarget(target: string, c: Context): string {
  const origin = new URL(c.req.url).origin;
  const canonical = canonicalSafeRedirect(target, origin);
  if (!canonical) {
    throw new Error(`otok-security: unsafe redirect target "${target}"`);
  }
  return canonical;
}

export { isSafeRedirect };
