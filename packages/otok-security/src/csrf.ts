import { defineMiddleware, type OtokMiddleware } from "otok/server";
import { getCookie, setCookie } from "hono/cookie";
import { secureCookieOptions } from "./cookies.js";
import type { CsrfOptions } from "./types.js";

export const CSRF_FIELD = "_csrf";
const PRODUCTION = () => process.env.NODE_ENV === "production";

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createSecurityCsrfMiddleware(options: CsrfOptions = {}): OtokMiddleware {
  const cookieName = options.cookieName ?? "otok_csrf";
  const secure = options.secure ?? PRODUCTION();
  if (PRODUCTION() && secure === false) {
    throw new Error("otok-security: CSRF cookies must be secure in production");
  }

  return defineMiddleware(async (c, next) => {
    const method = c.req.method.toUpperCase();
    if (method === "GET" || method === "HEAD") {
      if (!getCookie(c, cookieName)) {
        setCookie(
          c,
          cookieName,
          randomToken(),
          secureCookieOptions({ secure, sameSite: options.sameSite ?? "Lax", httpOnly: false }),
        );
      }
      await next();
      return;
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const contentType = c.req.header("content-type") ?? "";
      if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const cookieToken = getCookie(c, cookieName);
        const formData = await c.req.raw.clone().formData();
        const formToken = formData.get(CSRF_FIELD);
        if (!cookieToken || typeof formToken !== "string" || formToken !== cookieToken) {
          return c.text("CSRF token invalid", 403);
        }
      }
    }

    await next();
  });
}
