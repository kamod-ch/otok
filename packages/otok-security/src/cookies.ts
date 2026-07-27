import type { Context } from "hono";
import type { CookieOptions } from "hono/utils/cookie";
import type { SecureCookieDefaults } from "./types.js";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function resolveSecureCookieDefaults(
  options: boolean | SecureCookieDefaults | undefined,
): SecureCookieDefaults {
  if (options === false) {
    throw new Error(
      "otok-security: secureCookies cannot be disabled in production. Pass explicit SecureCookieDefaults instead.",
    );
  }

  const overrides = typeof options === "object" ? options : {};
  return {
    secure: overrides.secure ?? isProduction(),
    httpOnly: overrides.httpOnly ?? true,
    sameSite: overrides.sameSite ?? "Lax",
    path: overrides.path ?? "/",
  };
}

/** Apply secure cookie defaults to Hono setCookie options. */
export function secureCookieOptions(
  partial: CookieOptions = {},
  defaults?: SecureCookieDefaults,
): CookieOptions {
  const base = defaults ?? resolveSecureCookieDefaults(true);
  if (isProduction() && partial.secure === false) {
    throw new Error("otok-security: setting secure: false on cookies is not allowed in production");
  }
  return {
    path: base.path,
    secure: partial.secure ?? base.secure,
    httpOnly: partial.httpOnly ?? base.httpOnly,
    sameSite: partial.sameSite ?? base.sameSite,
    ...partial,
  };
}

export function attachSecureCookieDefaults(c: Context, defaults: SecureCookieDefaults): void {
  c.set("securityCookieDefaults", defaults);
}

export function readSecureCookieDefaults(c: Context): SecureCookieDefaults | undefined {
  return c.get("securityCookieDefaults") as SecureCookieDefaults | undefined;
}
