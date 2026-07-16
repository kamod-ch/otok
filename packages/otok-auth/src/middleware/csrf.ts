import { defineMiddleware, type OtokMiddleware } from "otok/server";
import { assertCsrf, ensureCsrfCookie, type CsrfOptions } from "../csrf.js";

export function createCsrfMiddleware(options: CsrfOptions = {}): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const method = c.req.method.toUpperCase();
    if (method === "GET" || method === "HEAD") {
      ensureCsrfCookie(c, options);
      await next();
      return;
    }

    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      const contentType = c.req.header("content-type") ?? "";
      if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const formData = await c.req.raw.clone().formData();
        assertCsrf(c, formData, options);
      }
    }

    await next();
  });
}
