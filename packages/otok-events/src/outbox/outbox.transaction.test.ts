import { describe, expect, it } from "vitest";
import { defineEvent, z, eventKey } from "../define-event.js";
import { createEventBus } from "../bus/event-bus.js";
import { enqueueOutboxEvent, OutboxProcessor } from "./processor.js";
import { metadataFromContext } from "../context.js";
import {
  MemoryOutboxStore,
  withOutboxTransaction,
  withOutboxTransactionRollback,
} from "../testing/memory-outbox.js";

const orderCreated = defineEvent({
  name: "order.created",
  version: 1,
  schema: z.object({ orderId: z.string(), amount: z.number() }),
});

describe("transactional outbox boundaries", () => {
  it("publishes only after outbox processor runs post-commit", async () => {
    const outbox = new MemoryOutboxStore();
    const bus = createEventBus();
    const handled: string[] = [];
    bus.subscribe(orderCreated, (e) => { handled.push(e.payload.orderId); });

    await withOutboxTransaction(outbox, async (trx) => {
      await enqueueOutboxEvent(
        trx,
        orderCreated,
        { orderId: "o-99", amount: 42 },
        metadataFromContext({ correlationId: "tx-1" }),
      );
    });

    expect(handled).toEqual([]);
    const processor = new OutboxProcessor({
      store: outbox,
      bus,
      definitions: new Map([[eventKey(orderCreated), orderCreated]]),
    });
    const result = await processor.processOnce();
    expect(result.published).toBe(1);
    expect(handled).toEqual(["o-99"]);
  });

  it("does not publish when transaction rolls back", async () => {
    const outbox = new MemoryOutboxStore();
    const bus = createEventBus();
    const handled: string[] = [];
    bus.subscribe(orderCreated, (e) => { handled.push(e.payload.orderId); });
    const processor = new OutboxProcessor({
      store: outbox,
      bus,
      definitions: new Map([[eventKey(orderCreated), orderCreated]]),
    });

    await expect(
      withOutboxTransactionRollback(outbox, async (trx) => {
        await enqueueOutboxEvent(trx, orderCreated, { orderId: "o-fail", amount: 1 }, metadataFromContext());
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    await processor.processOnce();
    expect(handled).toEqual([]);
    expect(outbox.records).toHaveLength(0);
  });
});

describe("kysely outbox (integration)", () => {
  it.skipIf(!process.env.KYSELY_SQLITE_TESTS)("sqlite kysely store", async () => {
    // Run with KYSELY_SQLITE_TESTS=1 after native better-sqlite3 build
    const { default: Database } = await import("better-sqlite3");
    const { Kysely, SqliteDialect } = await import("kysely");
    const { migrateEventsSchema, createKyselyOutboxStore } = await import("./kysely/store.js");

    const sqlite = new Database(":memory:");
    const db = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });
    await migrateEventsSchema(db as never, "sqlite");
    const store = createKyselyOutboxStore(db as never, "sqlite");
    expect(store).toBeDefined();
    sqlite.close();
  });
});
