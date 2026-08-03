# Transaction boundaries

Domain events in Otok follow strict transaction boundaries to avoid dual-write problems.

## Rule 1: Never publish before commit

```ts
// WRONG — handler may run before DB commit
await db.insertInto("companies").values(row).execute();
await events.publish(companyCreated, payload);
```

If the transaction rolls back after publish, consumers see an event for data that does not exist.

## Rule 2: Use transactional outbox in the same transaction

```ts
await db.transaction().execute(async (trx) => {
  await trx.insertInto("companies").values(row).execute();

  const outbox = createKyselyOutboxStore(trx, "sqlite");
  await enqueueOutboxEvent(outbox, companyCreated, payload, metadataFromContext());
});
// commit happens here

await outboxProcessor.processOnce(); // after commit
```

The outbox row is written in the **same transaction** as the business row. The in-process bus only receives the event after `OutboxProcessor` runs post-commit.

## Rule 3: In-process publish for non-persistent side effects

Use `events.publish()` directly when:

- No database mutation is involved
- The operation is intentionally ephemeral (dev/test)
- You accept at-most-once in-memory delivery

## Rule 4: Idempotent consumers

Consumers that may receive duplicates (retries, at-least-once outbox) must use `consumerName` + `idempotencyKey`:

```ts
bus.subscribe(companyCreated, handler, {
  consumerName: "crm.search",
});
```

With Kysely: `createKyselyIdempotencyStore(db)` backs durable deduplication.

## Sequence diagram

```
Request → Action
            ├─ BEGIN TX
            ├─ INSERT company
            ├─ INSERT outbox row
            └─ COMMIT
          → OutboxProcessor.processOnce()
            └─ bus.publishRaw → handlers
```

## Observability

Pass `requestId` from `@kamod-ch/otok-observability` into event context:

```ts
withRequestId(c.get("requestId"), () =>
  enqueueOutboxEvent(outbox, companyCreated, payload, metadataFromContext()),
);
```

Correlation IDs chain child events via `childEventMetadata(parentEvent)`.
