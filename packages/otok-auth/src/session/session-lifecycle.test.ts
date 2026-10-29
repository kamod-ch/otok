import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { h } from "preact";
import { createTestApp, requestRoute } from "@kamod-ch/otok-test";
import { defineMiddleware } from "@kamod-ch/otok/server";
import { sha256 } from "../crypto.js";
import { createMemorySessionAdapter, type MemorySessionRecord } from "../adapters/memory.js";
import { createKyselySessionAdapter } from "../adapters/kysely.js";
import { composeMiddleware, createRequireRoleMiddleware } from "../middleware/rbac.js";
import { createSessionManager } from "./manager.js";

type User = { id: string; email: string; role: "admin" | "viewer" };

function createPersistedSessions(options?: {
  path?: string;
  maxAgeSeconds?: number;
  rotationIntervalSeconds?: number;
  users?: Map<string, User>;
}) {
  const users = options?.users ?? new Map<string, User>([["u1", { id: "u1", email: "a@example.com", role: "admin" }]]);
  let stored: MemorySessionRecord[] = [];
  const adapter = createMemorySessionAdapter<User>({
    persistence: {
      load: () => stored,
      save: (sessions) => {
        stored = sessions.map((session) => ({ ...session }));
      },
    },
    resolveUser: ({ session }) => users.get(session.userId) ?? null,
  });
  const sessions = createSessionManager(
    {
      sessionCookie: "sid",
      csrfCookie: "csrf",
      secure: false,
      path: options?.path ?? "/",
      maxAgeSeconds: options?.maxAgeSeconds ?? 3600,
      rotationIntervalSeconds: options?.rotationIntervalSeconds ?? 1800,
    },
    adapter,
  );
  return { sessions, adapter, users, getStored: () => stored };
}

describe("session lifecycle (request sequences)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("login → logout → request with the original cookie is unauthenticated", async () => {
    const { sessions } = createPersistedSessions();
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.post("/logout", async (c) => {
      await sessions.revokeSession(c);
      return c.text("bye");
    });
    app.get("/me", async (c) => c.json({ user: await sessions.getSessionUser(c) }));

    const login = await app.request("/login");
    const token = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const staleCookie = `sid=${token}; csrf=abc`;

    await app.request("/logout", { method: "POST", headers: { cookie: staleCookie } });
    const afterLogout = await app.request("/me", { headers: { cookie: staleCookie } });
    expect(await afterLogout.json()).toEqual({ user: null });
  });

  it("logout clears session and CSRF cookies on the configured path", async () => {
    const { sessions } = createPersistedSessions({ path: "/app" });
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.post("/logout", async (c) => {
      await sessions.revokeSession(c);
      return c.text("bye");
    });

    const login = await app.request("/login");
    const token = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const logout = await app.request("/logout", {
      method: "POST",
      headers: { cookie: `sid=${token}; csrf=csrf-value` },
    });
    const cleared = logout.headers.getSetCookie();
    const sessionClear = cleared.find((v) => v.startsWith("sid="));
    const csrfClear = cleared.find((v) => v.startsWith("csrf="));
    expect(sessionClear).toContain("Max-Age=0");
    expect(sessionClear).toMatch(/Path=\/app/i);
    expect(csrfClear).toContain("Max-Age=0");
    expect(csrfClear).toMatch(/Path=\/app/i);
  });

  it("rotation keeps absolute expiry and invalidates the previous token", async () => {
    const { sessions, adapter, getStored } = createPersistedSessions({
      maxAgeSeconds: 3600,
      rotationIntervalSeconds: 0,
    });
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.post("/rotate", async (c) => {
      await sessions.rotateSession(c);
      return c.text("rotated");
    });

    const login = await app.request("/login");
    const oldToken = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const absoluteExpiry = getStored()[0]!.expiresAt;

    vi.setSystemTime(new Date("2026-06-01T12:30:00.000Z"));

    const rotate = await app.request("/rotate", {
      method: "POST",
      headers: { cookie: `sid=${oldToken}` },
    });
    const newCookie = rotate.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const newToken = newCookie.split("=")[1]!.split(";")[0]!;

    const active = getStored().filter((row) => !row.revokedAt);
    expect(active).toHaveLength(1);
    expect(active[0]!.expiresAt.getTime()).toBe(absoluteExpiry.getTime());
    expect(newCookie).toMatch(/Max-Age=1800/);
    expect(newToken).not.toBe(oldToken);
    expect(await adapter.resolveUser(sha256(oldToken))).toBeNull();
    expect(await adapter.resolveUser(sha256(newToken))).toEqual({
      id: "u1",
      email: "a@example.com",
      role: "admin",
    });
  });

  it("expired or revoked sessions are not reactivated by touch or rotation", async () => {
    const { sessions, adapter, getStored } = createPersistedSessions({
      maxAgeSeconds: 60,
      rotationIntervalSeconds: 0,
    });
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.get("/me", async (c) => c.json({ user: await sessions.getSessionUser(c) }));
    app.post("/rotate", async (c) => {
      await sessions.rotateSession(c);
      return c.text("rotated");
    });
    app.post("/logout", async (c) => {
      await sessions.revokeSession(c);
      return c.text("bye");
    });

    const login = await app.request("/login");
    const token = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const hash = sha256(token);

    vi.setSystemTime(new Date("2026-06-01T12:05:00.000Z"));
    const expiredMe = await app.request("/me", { headers: { cookie: `sid=${token}` } });
    expect(await expiredMe.json()).toEqual({ user: null });

    await adapter.touchRecord?.(hash);
    expect(await adapter.resolveUser(hash)).toBeNull();

    const rotate = await app.request("/rotate", { method: "POST", headers: { cookie: `sid=${token}` } });
    expect(rotate.headers.getSetCookie()).toHaveLength(0);
    expect(getStored().filter((row) => !row.revokedAt && row.expiresAt.getTime() > Date.now())).toHaveLength(0);

    const login2 = await app.request("/login");
    const liveToken = login2.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    await app.request("/logout", { method: "POST", headers: { cookie: `sid=${liveToken}` } });
    const liveHash = sha256(liveToken);
    await adapter.touchRecord?.(liveHash);
    expect(await adapter.resolveUser(liveHash)).toBeNull();
  });

  it("removed permissions apply on the next protected request (session → RBAC)", async () => {
    const users = new Map<string, User>([["u1", { id: "u1", email: "a@example.com", role: "admin" }]]);
    const { sessions } = createPersistedSessions({ users });

    const loginApp = new Hono();
    loginApp.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });

    const routeMiddleware = composeMiddleware(
      defineMiddleware(async (c, next) => {
        const user = await sessions.getSessionUser(c);
        if (user) c.set("user", user);
        await next();
      }),
      createRequireRoleMiddleware<User>({
        getRole: (user) => user.role,
        allowed: ["admin"],
      }),
    );

    const otokApp = createTestApp({
      routes: [
        {
          path: "/admin",
          component: () => h("p", null, "Admin"),
          middleware: [{ default: routeMiddleware }],
        },
      ],
    });

    const login = await loginApp.request("/login");
    const token = login.headers
      .getSetCookie()
      .find((v) => v.startsWith("sid="))!
      .split("=")[1]!
      .split(";")[0]!;
    const cookie = `sid=${token}`;

    const allowed = await requestRoute(otokApp, "/admin", { headers: { cookie } });
    expect(allowed.status).toBe(200);

    users.set("u1", { id: "u1", email: "a@example.com", role: "viewer" });
    const denied = await requestRoute(otokApp, "/admin", { headers: { cookie } });
    expect(denied.status).toBe(403);
  });
});

describe("session adapter contracts", () => {
  it("memory adapter touch does not reactivate expired sessions", async () => {
    const memory = createMemorySessionAdapter<User>({
      resolveUser: ({ session }) => (session.userId === "u1" ? { id: "u1", email: "a@b.c", role: "admin" } : null),
    });
    await memory.createRecord({
      tokenHash: "expired",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
      userAgent: null,
      ipAddress: null,
    });
    await memory.touchRecord?.("expired");
    await expect(memory.resolveUser("expired")).resolves.toBeNull();
  });

  it("kysely adapter touch does not reactivate expired sessions", async () => {
    const activeRow = {
      tokenHash: "hash-1",
      userId: "u1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null as Date | null,
      userAgent: null,
      ipAddress: null,
      lastSeenAt: null,
    };
    let touchCalled = false;
    const db = {
      updateTable: () => ({
        set: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                execute: vi.fn(async () => {
                  touchCalled = true;
                }),
              }),
            }),
          }),
        }),
      }),
      selectFrom: () => ({
        selectAll: () => ({
          where: () => ({
            executeTakeFirst: vi.fn(async () => activeRow),
          }),
        }),
      }),
      insertInto: vi.fn(),
      transaction: vi.fn(),
    };

    const kysely = createKyselySessionAdapter<User>({
      db: db as never,
      table: "appSession",
      resolveUser: async () => ({ id: "u1", email: "a@b.c", role: "admin" }),
    });
    await expect(kysely.resolveUser("hash-1")).resolves.toBeNull();
    await kysely.touchRecord?.("hash-1");
    expect(touchCalled).toBe(true);
    await expect(kysely.resolveUser("hash-1")).resolves.toBeNull();
  });
});
