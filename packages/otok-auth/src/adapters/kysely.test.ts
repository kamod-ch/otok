import { describe, expect, it, vi } from "vitest";
import { createKyselySessionAdapter, SESSION_TABLE_MIGRATION_SQL } from "./kysely.js";

type User = { id: string; email: string };

function createMockDb(options: { failInsertInTx?: boolean; activeRow?: boolean } = {}) {
  const calls: unknown[] = [];
  let rowRevoked = false;

  const activeRow = {
    tokenHash: "hash-1",
    userId: "u1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    revokedAt: null as Date | null,
    userAgent: "vitest",
    ipAddress: "127.0.0.1",
    lastSeenAt: null,
  };

  const db = {
    insertInto: vi.fn((table: string) => ({
      values: vi.fn((values: unknown) => ({
        execute: vi.fn(async () => {
          if (options.failInsertInTx) {
            throw new Error("insert failed");
          }
          calls.push({ op: "insert", table, values });
        }),
      })),
    })),
    updateTable: vi.fn((table: string) => ({
      set: vi.fn((values: unknown) => ({
        where: vi.fn((column: string, operator: string, value: unknown) => {
          const chain = {
            where: vi.fn((col2: string, op2: string, val2: unknown) => ({
              where: vi.fn((col3: string, op3: string, val3: unknown) => ({
                executeTakeFirst: vi.fn(async () => {
                  calls.push({
                    op: "updateConditional",
                    table,
                    values,
                    column,
                    operator,
                    value,
                    col2,
                    op2,
                    val2,
                    col3,
                    op3,
                    val3,
                  });
                  if (column === "tokenHash" && value === "hash-1" && !rowRevoked && options.activeRow !== false) {
                    rowRevoked = true;
                    return { numUpdatedRows: 1n };
                  }
                  return { numUpdatedRows: 0n };
                }),
                execute: vi.fn(async () => {
                  calls.push({ op: "update", table, values, column, operator, value });
                }),
              })),
              execute: vi.fn(async () => {
                calls.push({ op: "update", table, values, column, operator, value });
              }),
            })),
            executeTakeFirst: vi.fn(async () => {
              calls.push({ op: "updateTakeFirst", table, values, column, operator, value });
              return { numUpdatedRows: 1n };
            }),
            execute: vi.fn(async () => {
              calls.push({ op: "update", table, values, column, operator, value });
            }),
          };
          return chain;
        }),
      })),
    })),
    selectFrom: vi.fn((table: string) => ({
      selectAll: vi.fn(() => ({
        where: vi.fn((column: string, operator: string, value: unknown) => ({
          executeTakeFirst: vi.fn(async () => {
            calls.push({ op: "select", table, column, operator, value });
            if (value !== "hash-1" || options.activeRow === false) return undefined;
            if (rowRevoked) return { ...activeRow, revokedAt: new Date() };
            return activeRow;
          }),
        })),
      })),
    })),
    transaction: vi.fn(() => ({
      execute: vi.fn(async (fn: (trx: typeof db) => Promise<unknown>) => {
        calls.push({ op: "transaction" });
        try {
          return await fn(db);
        } catch (error) {
          rowRevoked = false;
          throw error;
        }
      }),
    })),
  };

  return { db: db as never, calls };
}

describe("createKyselySessionAdapter", () => {
  it("delegates session CRUD to Kysely and resolveUser to the app for active sessions", async () => {
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

    const record = await adapter.resolveRecord!("hash-1");
    expect(record?.userId).toBe("u1");
    expect(record?.createdAt).toBeInstanceOf(Date);

    await adapter.touchRecord?.("hash-1");
    await adapter.revokeRecord("hash-1");

    expect(calls.some((c) => (c as { op: string }).op === "insert")).toBe(true);
    expect(calls.some((c) => (c as { op: string }).op === "select")).toBe(true);
  });

  it("does not call app resolveUser for inactive sessions", async () => {
    const { db } = createMockDb({ activeRow: false });
    const resolveUser = vi.fn(async (): Promise<User | null> => ({ id: "u1", email: "a@example.com" }));
    const adapter = createKyselySessionAdapter<User>({ db, table: "appSession", resolveUser });
    await expect(adapter.resolveUser("hash-1")).resolves.toBeNull();
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it("rotateRecord commits revoke+insert in a transaction", async () => {
    const { db, calls } = createMockDb();
    const adapter = createKyselySessionAdapter<User>({
      db,
      table: "appSession",
      resolveUser: async () => null,
    });

    const won = await adapter.rotateRecord!("hash-1", {
      newTokenHash: "hash-2",
      userId: "u1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      userAgent: null,
      ipAddress: null,
    });

    expect(won).toBe(true);
    expect(calls.some((c) => (c as { op: string }).op === "transaction")).toBe(true);
    expect(calls.some((c) => (c as { op: string }).op === "updateConditional")).toBe(true);
  });

  it("rotateRecord rolls back when insert fails", async () => {
    const { db } = createMockDb({ failInsertInTx: true });
    const adapter = createKyselySessionAdapter<User>({
      db,
      table: "appSession",
      resolveUser: async () => null,
    });

    await expect(
      adapter.rotateRecord!("hash-1", {
        newTokenHash: "hash-2",
        userId: "u1",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        userAgent: null,
        ipAddress: null,
      }),
    ).rejects.toThrow("insert failed");

    const record = await adapter.resolveRecord!("hash-1");
    expect(record?.tokenHash).toBe("hash-1");
  });

  it("ships a reference SQL migration", () => {
    expect(SESSION_TABLE_MIGRATION_SQL).toContain("token_hash");
    expect(SESSION_TABLE_MIGRATION_SQL).toContain("expires_at");
  });
});
