import { describe, expect, it } from "vitest";
import { createMemorySessionAdapter, type MemorySessionRecord } from "./memory.js";

type User = { id: string; email: string };

describe("createMemorySessionAdapter", () => {
  it("creates, resolves, touches, and revokes sessions", async () => {
    const users = new Map<string, User>([["u1", { id: "u1", email: "a@example.com" }]]);
    const adapter = createMemorySessionAdapter<User>({
      resolveUser: ({ session }) => users.get(session.userId) ?? null,
    });

    const expiresAt = new Date(Date.now() + 60_000);
    await adapter.createRecord({
      tokenHash: "hash-1",
      userId: "u1",
      expiresAt,
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });

    await expect(adapter.resolveUser("hash-1")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
    });

    await adapter.touchRecord?.("hash-1");
    await adapter.revokeRecord("hash-1");
    await expect(adapter.resolveUser("hash-1")).resolves.toBeNull();
  });

  it("rotateRecord allows only one concurrent winner", async () => {
    const adapter = createMemorySessionAdapter<User>({
      resolveUser: ({ session }) => (session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null),
    });

    const expiresAt = new Date(Date.now() + 60_000);
    await adapter.createRecord({
      tokenHash: "old",
      userId: "u1",
      expiresAt,
      userAgent: null,
      ipAddress: null,
    });

    const [a, b] = await Promise.all([
      adapter.rotateRecord!("old", {
        newTokenHash: "new-a",
        userId: "u1",
        expiresAt,
        userAgent: null,
        ipAddress: null,
      }),
      adapter.rotateRecord!("old", {
        newTokenHash: "new-b",
        userId: "u1",
        expiresAt,
        userAgent: null,
        ipAddress: null,
      }),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    await expect(adapter.resolveUser("old")).resolves.toBeNull();
    const winnerHash = a ? "new-a" : "new-b";
    await expect(adapter.resolveUser(winnerHash)).resolves.toEqual({ id: "u1", email: "a@example.com" });
  });

  it("rotateRecord rolls back when persistence fails", async () => {
    let stored: MemorySessionRecord[] = [];
    let failSave = false;
    const adapter = createMemorySessionAdapter<User>({
      persistence: {
        load: () => stored,
        save: () => {
          if (failSave) throw new Error("persist failed");
        },
      },
      resolveUser: ({ session }) => (session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null),
    });

    const expiresAt = new Date(Date.now() + 60_000);
    await adapter.createRecord({
      tokenHash: "old",
      userId: "u1",
      expiresAt,
      userAgent: null,
      ipAddress: null,
    });
    stored = [
      {
        tokenHash: "old",
        userId: "u1",
        createdAt: new Date(),
        expiresAt,
        userAgent: null,
        ipAddress: null,
        revokedAt: null,
        lastSeenAt: null,
      },
    ];

    failSave = true;
    await expect(
      adapter.rotateRecord!("old", {
        newTokenHash: "new",
        userId: "u1",
        expiresAt,
        userAgent: null,
        ipAddress: null,
      }),
    ).rejects.toThrow("persist failed");

    await expect(adapter.resolveUser("old")).resolves.toEqual({ id: "u1", email: "a@example.com" });
    await expect(adapter.resolveUser("new")).resolves.toBeNull();
  });

  it("persists sessions through load/save hooks", async () => {
    let stored: MemorySessionRecord[] = [];
    const adapter = createMemorySessionAdapter<User>({
      persistence: {
        load: () => stored,
        save: (sessions) => {
          stored = sessions.map((session) => ({ ...session }));
        },
      },
      resolveUser: ({ session }) => (session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null),
    });

    await adapter.createRecord({
      tokenHash: "hash-2",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: null,
      ipAddress: null,
    });

    const reloaded = createMemorySessionAdapter<User>({
      persistence: {
        load: () => stored,
        save: (sessions) => {
          stored = sessions.map((session) => ({ ...session }));
        },
      },
      resolveUser: ({ session }) => (session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null),
    });

    await expect(reloaded.resolveUser("hash-2")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
    });
  });
});
