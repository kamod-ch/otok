import { describe, expect, it } from "vitest";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  assertCsrf,
  CSRF_FIELD,
  ensureCsrfCookie,
  verifyCsrf,
} from "./csrf.js";
import { isOtokHttpError } from "otok/server";

function withContext(handler: (c: Context) => void | Promise<void>, init?: RequestInit) {
  const app = new Hono();
  app.get("/", async (c) => {
    await handler(c);
    return c.text("ok");
  });
  app.post("/", async (c) => {
    await handler(c);
    return c.text("ok");
  });
  return app.request("/", init);
}

describe("csrf", () => {
  it("ensureCsrfCookie sets a readable cookie and returns the token", async () => {
    let token = "";
    const response = await withContext((c) => {
      token = ensureCsrfCookie(c, { cookieName: "test_csrf" });
    });
    expect(token.length).toBeGreaterThan(10);
    expect(response.headers.getSetCookie().some((v) => v.startsWith(`test_csrf=${token}`))).toBe(true);
  });

  it("verifyCsrf accepts matching cookie and form token", async () => {
    const app = new Hono();
    app.get("/", (c) => {
      const token = ensureCsrfCookie(c, { cookieName: "csrf" });
      return c.json({ token, cookie: getCookie(c, "csrf") });
    });
    const get = await app.request("/");
    const { token } = (await get.json()) as { token: string };
    const cookie = get.headers.getSetCookie().find((v) => v.startsWith("csrf="))!;
    const cookieValue = cookie.split("=")[1]!.split(";")[0]!;

    const app2 = new Hono();
    app2.post("/", (c) => c.json({ ok: verifyCsrf(c, token, { cookieName: "csrf" }) }));
    const post = await app2.request("/", {
      method: "POST",
      headers: { cookie: `csrf=${cookieValue}` },
    });
    expect(await post.json()).toEqual({ ok: true });
  });

  it("assertCsrf throws OtokHttpError 403 on mismatch", async () => {
    const app = new Hono();
    app.post("/", async (c) => {
      try {
        assertCsrf(c, new FormData(), { cookieName: "csrf" });
        return c.text("ok");
      } catch (error) {
        if (isOtokHttpError(error)) return c.json({ status: error.status, message: error.message }, error.status as 403);
        throw error;
      }
    });
    const response = await app.request("/", { method: "POST" });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ status: 403 });
  });

  it("exposes CSRF_FIELD as _csrf", () => {
    expect(CSRF_FIELD).toBe("_csrf");
  });
});
