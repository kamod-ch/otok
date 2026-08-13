import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { isOtokHttpError } from "@kamod-ch/otok/server";
import { createAuthHelpers } from "./context.js";
import { AuthError } from "./errors.js";
import { sha256 } from "./crypto.js";
import { createSessionManager, type SessionAdapter } from "./session/index.js";

type User = { id: string; role: string };

function memoryAdapter(): SessionAdapter<User> & {
  records: Map<string, { userId: string; createdAt: Date; expiresAt: Date; revoked: boolean }>;
} {
  const records = new Map<
    string,
    { userId: string; createdAt: Date; expiresAt: Date; revoked: boolean }
  >();
  return {
    records,
    async createRecord(input) {
      records.set(input.tokenHash, {
        userId: input.userId,
        createdAt: new Date(),
        expiresAt: input.expiresAt,
        revoked: false,
      });
    },
    async revokeRecord(tokenHash) {
      const row = records.get(tokenHash);
      if (row) row.revoked = true;
    },
    async resolveUser(tokenHash) {
      const row = records.get(tokenHash);
      if (!row || row.revoked || row.expiresAt.getTime() <= Date.now()) return null;
      return { id: row.userId, role: "member" };
    },
    async resolveRecord(tokenHash) {
      const row = records.get(tokenHash);
      if (!row || row.revoked) return null;
      return {
        tokenHash,
        userId: row.userId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      };
    },
  };
}

describe("createAuthHelpers", () => {
  it("requireUser redirects when unauthenticated", async () => {
    const sessions = createSessionManager({ sessionCookie: "sid", secure: false }, memoryAdapter());
    const auth = createAuthHelpers({ sessions, loginPath: "/login" });
    const app = new Hono();
    app.get("/", async (c) => {
      try {
        await auth.requireUser(c);
        return c.text("ok");
      } catch (error) {
        if (isOtokHttpError(error)) {
          return c.redirect(error.headers.get("location") ?? "/login", error.status as 303);
        }
        throw error;
      }
    });
    const response = await app.request("/", { redirect: "manual" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("requireRole rejects insufficient permissions", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager({ sessionCookie: "sid", secure: false }, adapter);
    const auth = createAuthHelpers({
      sessions,
      getRole: (user) => user.role,
    });
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "u1");
      return c.text("ok");
    });
    app.get("/admin", async (c) => {
      try {
        await auth.requireRole(c, "admin");
        return c.text("ok");
      } catch (error) {
        if (error instanceof AuthError) return c.json(error.toJSON(), { status: 403 });
        throw error;
      }
    });

    const login = await app.request("/login");
    const cookie = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const token = cookie.split("=")[1]!.split(";")[0]!;

    const response = await app.request("/admin", { headers: { cookie: `sid=${token}` } });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "forbidden",
      message: "Insufficient permissions",
    });
  });
});

describe("session rotation", () => {
  it("rotates session token when interval elapsed", async () => {
    const adapter = memoryAdapter();
    const sessions = createSessionManager(
      {
        sessionCookie: "sid",
        secure: false,
        rotationIntervalSeconds: 0,
      },
      adapter,
    );
    const app = new Hono();
    app.get("/login", async (c) => {
      await sessions.createSession(c, "user-1");
      return c.text("ok");
    });
    app.get("/me", async (c) => {
      const user = await sessions.getSessionUser(c);
      return c.json({ id: user?.id ?? null });
    });

    const login = await app.request("/login");
    const cookie = login.headers.getSetCookie().find((v) => v.startsWith("sid="))!;
    const oldToken = cookie.split("=")[1]!.split(";")[0]!;

    const me = await app.request("/me", { headers: { cookie: `sid=${oldToken}` } });
    expect((await me.json()).id).toBe("user-1");
    const oldRecord = adapter.records.get(sha256(oldToken));
    expect(oldRecord?.revoked).toBe(true);
  });
});
