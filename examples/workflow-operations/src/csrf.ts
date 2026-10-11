import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export const CSRF_FIELD = "_csrf";
const COOKIE = "workflow_ops_csrf";

export function csrfMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    if (method === "GET" || method === "HEAD") {
      if (!getCookie(c, COOKIE)) {
        const token = crypto.randomUUID();
        setCookie(c, COOKIE, token, { httpOnly: false, sameSite: "Lax", path: "/" });
      }
      await next();
      return;
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const contentType = c.req.header("content-type") ?? "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const cookieToken = getCookie(c, COOKIE);
        const form = await c.req.parseBody();
        const formToken = form[CSRF_FIELD];
        if (!cookieToken || typeof formToken !== "string" || formToken !== cookieToken) {
          return c.text("CSRF token invalid", 403);
        }
      }
    }
    await next();
  };
}

export function csrfToken(c: Context): string {
  const existing = getCookie(c, COOKIE);
  if (existing) return existing;
  const token = crypto.randomUUID();
  setCookie(c, COOKIE, token, { httpOnly: false, sameSite: "Lax", path: "/" });
  return token;
}
