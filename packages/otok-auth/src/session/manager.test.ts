import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sha256 } from "../crypto.js";
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
    const sessions = createSessionManager(
      { sessionCookie: "sid", csrfCookie: "csrf", secure: false },
      adapter,
    );
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
});
