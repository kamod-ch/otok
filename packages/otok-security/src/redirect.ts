import type { Context } from "hono";
import { defineMiddleware, type OtokMiddleware } from "otok/server";
import type { OpenRedirectOptions } from "./types.js";

const DEFAULT_PARAMS = ["redirect", "returnTo", "next", "url", "return", "continue"];

function isSafeRedirect(target: string, origin: string): boolean {
  if (!target) return false;
  if (target.startsWith("/") && !target.startsWith("//")) return true;
  try {
    const parsed = new URL(target, origin);
    const base = new URL(origin);
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
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
  if (!isSafeRedirect(target, origin)) {
    throw new Error(`otok-security: unsafe redirect target "${target}"`);
  }
  return target;
}

export { isSafeRedirect };
