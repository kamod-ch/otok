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

  it("persists sessions through load/save hooks", async () => {
    let stored: MemorySessionRecord[] = [];
    const adapter = createMemorySessionAdapter<User>({
      persistence: {
        load: () => stored,
        save: (sessions) => {
          stored = sessions.map((session) => ({ ...session }));
        },
      },
      resolveUser: ({ session }) =>
        session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null,
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
      resolveUser: ({ session }) =>
        session.userId === "u1" ? { id: "u1", email: "a@example.com" } : null,
    });

    await expect(reloaded.resolveUser("hash-2")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
    });
  });
});
