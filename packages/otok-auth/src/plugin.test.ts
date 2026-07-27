import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createMemorySessionAdapter } from "./adapters/memory.js";
import auth, { configureAuthApp } from "./plugin.js";
import { getAuthRuntime, resetAuthRuntimeForTests } from "./registry.js";
import type { AuthUser } from "./types.js";

type User = AuthUser & { id: string; email: string };

describe("auth plugin", () => {
  it("registers runtime and exposes logout route", async () => {
    const users = new Map<string, User>([["u1", { id: "u1", email: "a@b.c" }]]);
    const adapter = createMemorySessionAdapter<User>({
      resolveUser: ({ session }) => users.get(session.userId) ?? null,
    });

    const app = new Hono();
    configureAuthApp(app, {
      secret: "test-auth-secret-at-least-32-chars-long",
      session: { cookieName: "otok_session" },
      adapter,
      logoutPath: "/auth/logout",
    });

    app.get("/login", async (c) => {
      await getAuthRuntime().sessions.createSession(c, "u1");
      return c.text("ok");
    });

    const login = await app.request("/login");
    const cookie = login.headers.getSetCookie().find((v) => v.startsWith("otok_session="))!;
    const token = cookie.split("=")[1]!.split(";")[0]!;

    const logout = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie: `otok_session=${token}` },
      redirect: "manual",
    });
    expect(logout.status).toBe(303);
    expect(logout.headers.get("location")).toBe("/login");
  });

  it("factory returns plugin with configureApp hook", () => {
    const plugin = auth({
      secret: "test-auth-secret-at-least-32-chars-long",
      session: { cookieName: "otok_session" },
      adapter: createMemorySessionAdapter<AuthUser>({ resolveUser: () => null }),
    });
    expect(plugin.name).toBe("@kamod-ch/otok-auth");
    expect(typeof plugin.configureApp).toBe("function");
  });
});

describe("registerAuthRuntime", () => {
  it("throws when runtime is missing", () => {
    resetAuthRuntimeForTests();
    expect(() => getAuthRuntime()).toThrow(/no auth runtime registered/);
  });
});
