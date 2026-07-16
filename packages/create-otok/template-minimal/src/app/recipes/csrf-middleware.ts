import { defineMiddleware } from "otok/server";
import { assertCsrf, ensureCsrfCookie } from "../../lib/csrf";

/**
 * Example CSRF middleware for cookie-authenticated apps.
 * Enable by creating `src/app/routes/_middleware.ts` that re-exports this file
 * or copy the body into a route tree that accepts form posts.
 *
 * GET/HEAD requests receive a CSRF cookie. POST/PUT/PATCH/DELETE form posts
 * must include a matching `_csrf` field.
 */
export default defineMiddleware(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    ensureCsrfCookie(c);
    await next();
    return;
  }

  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await c.req.raw.clone().formData();
      assertCsrf(c, formData);
    }
  }

  await next();
});
