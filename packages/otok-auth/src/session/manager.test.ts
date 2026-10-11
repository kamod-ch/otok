import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sha256 } from "../crypto.js";
import { createMemorySessionAdapter } from "../adapters/memory.js";
import { createSessionManager, type SessionAdapter } from "./index.js";

type User = { id: string; email: string };

function memoryAdapter(): SessionAdapter<User> & {
  records: Map<string, { userId: string; revoked: boolean }>;
  touchCalls: string[];
} {
  const records = new Map<string, { userId: string; revoked: boolean }>();
  const touchCalls: string[] = [];
  return {
    records,
    touchCalls,
    async createRecord(input) {
      records.set(input.tokenHash, { userId: input.userId, revoked: false });
    },
    async revokeRecord(tokenHash) {
      const row = records.get(tokenHash);
      if (row) row.revoked = true;
    },
    async resolveUser(tokenHash) {
      const row = records.get(tokenHash);
      if (!row || row.revoked) return null;
      return { id: row.userId, email: `${row.userId}@example.com` };
    },
    async touchRecord(tokenHash) {
      touchCalls.push(tokenHash);
    },
  };
}

/** Type fixture: third-party adapters without leased metadata stay valid. */
const legacyAdapterFixture: SessionAdapter<User> = {
  async createRecord() {
    return undefined;
  },
  async revokeRecord() {
    return undefined;
  },
  async resolveUser() {
    return null;
  },
};

describe("legacy SessionAdapter fixture", () => {
  it("remains assignable without resolveRecord or rotateRecord", () => {
    expect(legacyAdapterFixture.resolveUser).toBeTypeOf("function");
  });
});

describe("createSessionManager", () => {
  it("createSession persists a hashed token and sets cookies", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager(
      { sessionCookie: "sid", csrfCookie: "csrf", secure: false, maxAgeSeconds: 3600 },
      adapter,
    );
    const app = new Hono();
    app.get("/", async (c) => {
      await sessions.createSession(c, "user-1");
      return c.text("ok");
    });

    const response = await app.request("/");
    const setCookies = response.headers.getSetCookie();
    const sessionCookie = setCookies.find((v) => v.startsWith("sid="))!;
    const token = sessionCookie.split("=")[1]!.split(";")[0]!;

    expect(adapter.records.has(sha256(token))).toBe(true);
    expect(setCookies.some((v) => v.startsWith("csrf="))).toBe(true);
    expect(sessionCookie).toContain("HttpOnly");
  });

  it("getSessionUser resolves the user and touches the record", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager({ sessionCookie: "sid", secure: false }, adapter);
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "user-2");
      return c.text("ok");
    });
    app.get("/me", async (c) => {
      const user = await sessions.getSessionUser(c);
      return c.json(user);
    });

    const login = await app.request("/login");
    const sessionCookie = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const token = sessionCookie.split("=")[1]!.split(";")[0]!;

    const me = await app.request("/me", { headers: { cookie: `sid=${token}` } });
    expect(await me.json()).toEqual({ id: "user-2", email: "user-2@example.com" });
    expect(adapter.touchCalls).toEqual([sha256(token)]);
  });

  it("revokeSession clears cookies and revokes the adapter record", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager({ sessionCookie: "sid", csrfCookie: "csrf", secure: false }, adapter);
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "user-3");
      return c.text("ok");
    });
    app.post("/logout", async (c) => {
      await sessions.revokeSession(c);
      return c.json({
        sid: getCookie(c, "sid") ?? null,
        csrf: getCookie(c, "csrf") ?? null,
        revoked: [...adapter.records.values()].every((r) => r.revoked),
      });
    });

    const login = await app.request("/login");
    const sessionCookie = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const token = sessionCookie.split("=")[1]!.split(";")[0]!;
    const logout = await app.request("/logout", {
      method: "POST",
      headers: { cookie: `sid=${token}; csrf=abc` },
    });
    const body = (await logout.json()) as { revoked: boolean };
    expect(body.revoked).toBe(true);
    expect(logout.headers.getSetCookie().some((v) => v.includes("sid=") && v.includes("Max-Age=0"))).toBe(true);
  });

  it("getSessionUser returns null without a cookie", async () => {
    const sessions = createSessionManager({ sessionCookie: "sid" }, memoryAdapter());
    const getUser = vi.fn(sessions.getSessionUser);
    const app = new Hono();
    app.get("/", async (c) => c.json(await getUser(c)));
    expect(await (await app.request("/")).json()).toBeNull();
  });

  it("manual rotate without resolveRecord is a no-op (no logout)", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager({ sessionCookie: "sid", secure: false }, adapter);
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "user-legacy");
      return c.text("ok");
    });
    app.post("/rotate", async (c) => {
      await sessions.rotateSession(c);
      const user = await sessions.getSessionUser(c);
      return c.json({ user });
    });

    const login = await app.request("/login");
    const token = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!.split("=")[1]!.split(";")[0]!;
    const rotate = await app.request("/rotate", {
      method: "POST",
      headers: { cookie: `sid=${token}` },
    });
    expect(rotate.headers.getSetCookie()).toHaveLength(0);
    expect(await rotate.json()).toEqual({ user: { id: "user-legacy", email: "user-legacy@example.com" } });
  });

  it("rotateSession issues a new token and caps cookie max-age to remaining absolute expiry", async () => {
    const users = new Map<string, User>([["u1", { id: "u1", email: "a@example.com" }]]);
    const adapter = createMemorySessionAdapter<User>({
      resolveUser: ({ session }) => users.get(session.userId) ?? null,
    });
    const sessions = createSessionManager(
      {
        sessionCookie: "sid",
        csrfCookie: "csrf",
        secure: false,
        maxAgeSeconds: 3600,
        rotationIntervalSeconds: 0,
      },
      adapter,
    );

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
    const oldToken = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!.split("=")[1]!.split(";")[0]!;
    const rotate = await app.request("/rotate", {
      method: "POST",
      headers: { cookie: `sid=${oldToken}` },
    });
    const newCookie = rotate.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const newToken = newCookie.split("=")[1]!.split(";")[0]!;
    expect(newToken).not.toBe(oldToken);
    expect(await adapter.resolveUser(sha256(oldToken))).toBeNull();
    expect(await adapter.resolveUser(sha256(newToken))).toEqual({ id: "u1", email: "a@example.com" });
    expect(newCookie).toMatch(/Max-Age=\d+/);
    expect(newCookie).toContain("HttpOnly");
  });

  it("concurrent rotate: exactly one winner sets cookies", async () => {
    const users = new Map<string, User>([["u1", { id: "u1", email: "a@example.com" }]]);
    let stored: import("../adapters/memory.js").MemorySessionRecord[] = [];
    const adapter = createMemorySessionAdapter<User>({
      persistence: {
        load: () => stored,
        save: (sessions) => {
          stored = sessions.map((session) => ({ ...session }));
        },
      },
      resolveUser: ({ session }) => users.get(session.userId) ?? null,
    });
    const sessions = createSessionManager({ sessionCookie: "sid", csrfCookie: "csrf", secure: false }, adapter);

    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.post("/rotate", async (c) => {
      await sessions.rotateSession(c);
      return c.json({ sid: getCookie(c, "sid") ?? null });
    });

    const login = await app.request("/login");
    const token = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!.split("=")[1]!.split(";")[0]!;
    const cookie = `sid=${token}`;

    const [a, b] = await Promise.all([
      app.request("/rotate", { method: "POST", headers: { cookie } }),
      app.request("/rotate", { method: "POST", headers: { cookie } }),
    ]);

    const cookiesA = a.headers.getSetCookie();
    const cookiesB = b.headers.getSetCookie();
    const winners = [cookiesA, cookiesB].filter((list) =>
      list.some((v) => v.startsWith("sid=") && !v.includes("Max-Age=0")),
    );
    expect(winners).toHaveLength(1);

    const active = stored.filter((s) => !s.revokedAt && s.expiresAt.getTime() > Date.now());
    expect(active).toHaveLength(1);
    expect(await adapter.resolveUser(sha256(token))).toBeNull();
  });
});
