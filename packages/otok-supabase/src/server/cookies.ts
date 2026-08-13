import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { mergeCookieOptions, type SupabaseConfig, type SupabaseCookieOptions } from "../config.js";
import { SupabaseCookieError } from "../errors.js";

export interface CookieRecord {
  name: string;
  value: string;
}

export function readRequestCookies(c: Context): CookieRecord[] {
  const header = c.req.header("Cookie") ?? "";
  return parseCookieHeader(header).map(({ name, value }) => ({ name, value: value ?? "" }));
}

export function readRequestCookie(c: Context, name: string): string | undefined {
  return getCookie(c, name);
}

function resolveSameSite(value: unknown): "Strict" | "Lax" | "None" | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "lax") return "Lax";
  if (normalized === "none") return "None";
  return undefined;
}

function toHonoCookieOptions(
  options: Record<string, unknown> | undefined,
  defaults: SupabaseCookieOptions | undefined,
): Parameters<typeof setCookie>[3] {
  const merged = mergeCookieOptions(options, defaults);
  return {
    domain: typeof merged.domain === "string" ? merged.domain : undefined,
    path: typeof merged.path === "string" ? merged.path : "/",
    secure: typeof merged.secure === "boolean" ? merged.secure : undefined,
    sameSite: resolveSameSite(merged.sameSite),
    httpOnly: typeof merged.httpOnly === "boolean" ? merged.httpOnly : undefined,
    maxAge: typeof merged.maxAge === "number" ? merged.maxAge : undefined,
    expires: merged.expires instanceof Date ? merged.expires : undefined,
  };
}

export function writeResponseCookie(
  c: Context,
  name: string,
  value: string,
  options: Record<string, unknown> | undefined,
  defaults: SupabaseCookieOptions | undefined,
): void {
  setCookie(c, name, value, toHonoCookieOptions(options, defaults));
}


export function createOtokSupabaseCookieMethods(c: Context, config: SupabaseConfig) {
  const defaults = config.cookieOptions;

  return {
    getAll() {
      return readRequestCookies(c);
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>, headers?: Record<string, string>) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          writeResponseCookie(c, name, value, options, defaults);
          c.res.headers.append("Set-Cookie", serializeCookieHeader(name, value, mergeCookieOptions(options, defaults)));
        }

        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            if (value !== undefined) {
              c.header(key, value);
            }
          }
        }
      } catch (cause) {
        throw new SupabaseCookieError(
          cause instanceof Error ? cause.message : "Failed to write Supabase session cookies.",
        );
      }
    },
  };
}

export function getSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("Set-Cookie");
  if (!raw) return [];
  return raw.split(/,(?=\s*[^;,=\s]+=)/);
}

export function mergeResponseHeaders(existing: Headers, incoming: Headers): Headers {
  const merged = new Headers(existing);
  incoming.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      merged.append("Set-Cookie", value);
      return;
    }
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  });
  return merged;
}
