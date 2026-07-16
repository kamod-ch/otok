import { describe, expect, it, vi } from "vitest";
import { createKyselySessionAdapter, SESSION_TABLE_MIGRATION_SQL } from "./kysely.js";

type User = { id: string; email: string };

function createMockDb() {
  const calls: unknown[] = [];

  const db = {
    insertInto: vi.fn((table: string) => ({
      values: vi.fn((values: unknown) => ({
        execute: vi.fn(async () => {
          calls.push({ op: "insert", table, values });
        }),
      })),
    })),
    updateTable: vi.fn((table: string) => ({
      set: vi.fn((values: unknown) => ({
        where: vi.fn((column: string, operator: string, value: unknown) => ({
          execute: vi.fn(async () => {
            calls.push({ op: "update", table, values, column, operator, value });
          }),
        })),
      })),
    })),
  };

  return { db: db as never, calls };
}

describe("createKyselySessionAdapter", () => {
  it("delegates session CRUD to Kysely and resolveUser to the app", async () => {
    const { db, calls } = createMockDb();
    const resolveUser = vi.fn(async (tokenHash: string): Promise<User | null> =>
      tokenHash === "hash-1" ? { id: "u1", email: "a@example.com" } : null,
    );

    const adapter = createKyselySessionAdapter<User>({
      db,
      table: "appSession",
      resolveUser,
    });

    await adapter.createRecord({
      tokenHash: "hash-1",
      userId: "u1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });

    await expect(adapter.resolveUser("hash-1")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
    });
    expect(resolveUser).toHaveBeenCalledWith("hash-1");

    await adapter.touchRecord?.("hash-1");
    await adapter.revokeRecord("hash-1");

    expect(calls).toEqual([
      {
        op: "insert",
        table: "appSession",
        values: {
          userId: "u1",
          tokenHash: "hash-1",
          expiresAt: new Date("2030-01-01T00:00:00.000Z"),
          userAgent: "vitest",
          ipAddress: "127.0.0.1",
        },
      },
      {
        op: "update",
        table: "appSession",
        values: { lastSeenAt: expect.any(Date) },
        column: "tokenHash",
        operator: "=",
        value: "hash-1",
      },
      {
        op: "update",
        table: "appSession",
        values: { revokedAt: expect.any(Date) },
        column: "tokenHash",
        operator: "=",
        value: "hash-1",
      },
    ]);
  });

  it("ships a reference SQL migration", () => {
    expect(SESSION_TABLE_MIGRATION_SQL).toContain("token_hash");
    expect(SESSION_TABLE_MIGRATION_SQL).toContain("expires_at");
  });
});
