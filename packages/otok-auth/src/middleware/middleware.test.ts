import { describe, expect, it } from "vitest";
import { h } from "preact";
import { createTestApp, renderRoute, requestRoute } from "@otok/test";
import type { OtokPageProps } from "otok/server";
import { CSRF_FIELD } from "../csrf.js";
import { createApiGuard, createCsrfMiddleware, createRequireAuthMiddleware } from "./index.js";
import type { Context } from "hono";
import { Hono } from "hono";

type User = { id: string; email: string };

describe("createRequireAuthMiddleware", () => {
  it("allows public paths without a user", async () => {
    const middleware = createRequireAuthMiddleware<User>({
      getUser: async () => null,
      publicPaths: ["/login"],
    });
    const { response, html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/login",
            component: () => h("p", null, "Login"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/login",
    );
    expect(response.status).toBe(200);
    expect(html).toContain("Login");
  });

  it("redirects unauthenticated users to login", async () => {
    const middleware = createRequireAuthMiddleware<User>({
      getUser: async () => null,
      loginPath: "/login",
    });
    const response = await requestRoute(
      createTestApp({
        routes: [
          {
            path: "/admin",
            component: () => h("p", null, "Admin"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/admin",
      { redirect: "manual" },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("sets context and calls onAuthenticated when user exists", async () => {
    const user = { id: "1", email: "a@b.c" };
    let seen: User | undefined;
    const middleware = createRequireAuthMiddleware<User>({
      getUser: async () => user,
      onAuthenticated: (_c, u) => {
        seen = u;
      },
    });
    const { response, html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/home",
            component: (({ data }: OtokPageProps<{ email: string }>) =>
              h("p", null, data.email)) as (props: OtokPageProps) => ReturnType<typeof h>,
            loader: ({ hono }) => ({ email: (hono as Context).get("user").email as string }),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/home",
    );
    expect(response.status).toBe(200);
    expect(html).toContain("a@b.c");
    expect(seen).toEqual(user);
  });
});

describe("createCsrfMiddleware", () => {
  it("sets CSRF cookie on GET", async () => {
    const middleware = createCsrfMiddleware({ cookieName: "csrf", secure: false });
    const response = await requestRoute(
      createTestApp({
        routes: [
          {
            path: "/",
            component: () => h("p", null, "Home"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/",
    );
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().some((v) => v.startsWith("csrf="))).toBe(true);
  });

  it("rejects form POST without CSRF token", async () => {
    const middleware = createCsrfMiddleware({ cookieName: "csrf", secure: false });
    const response = await requestRoute(
      createTestApp({
        routes: [
          {
            path: "/save",
            component: () => h("p", null, "ok"),
            action: () => ({ ok: true }),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/save",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", cookie: "csrf=token-a" },
        body: new URLSearchParams({ name: "x" }),
      },
    );
    expect(response.status).toBe(403);
  });

  it("allows form POST with matching CSRF token", async () => {
    const middleware = createCsrfMiddleware({ cookieName: "csrf", secure: false });
    const { response, html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/save",
            component: ({ actionData }: OtokPageProps) =>
              h("p", null, (actionData as { ok?: boolean } | undefined)?.ok ? "saved" : "idle"),
            action: () => ({ ok: true }),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/save",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", cookie: "csrf=token-a" },
        body: new URLSearchParams({ [CSRF_FIELD]: "token-a", name: "x" }),
      },
    );
    expect(response.status).toBe(200);
    expect(html).toContain("saved");
  });
});

describe("createApiGuard", () => {
  it("returns the user from getUser", async () => {
    const user = { id: "9", email: "x@y.z" };
    const requireApiUser = createApiGuard(async () => user);
    const app = new Hono();
    app.get("/api/me", async (c) => {
      const u = await requireApiUser(c);
      if (!u) return c.json({ error: { code: "unauthorized" } }, 401);
      return c.json(u);
    });
    expect(await (await app.request("/api/me")).json()).toEqual(user);
  });

  it("returns null when unauthenticated", async () => {
    const requireApiUser = createApiGuard(async () => null);
    const app = new Hono();
    app.get("/api/me", async (c) => {
      const u = await requireApiUser(c);
      if (!u) return c.json({ error: { code: "unauthorized" } }, 401);
      return c.json(u);
    });
    const response = await app.request("/api/me");
    expect(response.status).toBe(401);
  });
});
