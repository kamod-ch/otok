# @kamod-ch/otok-events

Typed domain events for Otok — in-process bus, transactional outbox, Kysely integration, and CRM example.

## Install

```bash
pnpm add @kamod-ch/otok-events
```

## Define events

```ts
import { defineEvent, z, events } from "@kamod-ch/otok-events";

const companyCreated = defineEvent({
  name: "company.created",
  version: 1,
  schema: z.object({
    companyId: z.string(),
    createdBy: z.string(),
  }),
});

await events.publish(companyCreated, { companyId, createdBy });
```

## Plugin

```ts
import eventsPlugin from "@kamod-ch/otok-events/plugin";

export default defineConfig({
  plugins: [eventsPlugin()],
});
```

## Transactional outbox (Kysely)

```ts
import { enqueueOutboxEvent, OutboxProcessor } from "@kamod-ch/otok-events";
import { createKyselyOutboxStore, migrateEventsSchema } from "@kamod-ch/otok-events/outbox/kysely";

await migrateEventsSchema(db, "postgres"); // idempotent; adds lease columns on existing tables
await db.transaction().execute(async (trx) => {
  await trx.insertInto("companies").values(row).execute();
  await enqueueOutboxEvent(createKyselyOutboxStore(trx), companyCreated, payload, metadata);
});
await processor.processOnce();
```

### Leased outbox (multi-worker, at-least-once)

The Kysely store implements `LeasedOutboxStore`: `claimLeased` atomically marks rows as `processing`, increments `attempts` once per claim, and returns a `leaseToken` plus `leaseExpiresAt`. `OutboxProcessor` renews leases during slow handlers and uses token-bound `markPublishedLeased` / `markFailedLeased` / `markDeadLeased`.

**Not exactly-once:** if a worker crashes after publishing to the bus but before acking the outbox row, the event may be delivered again after lease reclaim. Handlers must be idempotent.

**Migration order:** run `migrateEventsSchema` on deploy, stop legacy workers that used non-atomic `claimPending`, then start lease-aware workers. Legacy `processing` rows without a lease token are reset to `pending` during migration so they can be reclaimed safely. Do not run old tokenless workers alongside leased workers.

**Legacy `OutboxStore`:** custom stores may keep `claimPending` for single-worker mode only. Tokenless `markPublished` / `markFailed` / `markDead` on Kysely rows with an active lease throw `OutboxLeaseError`.

## CRM example

```ts
import { companyCreated, registerCrmEventHandlers, createEventBus } from "@kamod-ch/otok-events";

const bus = createEventBus();
registerCrmEventHandlers(bus, { activities, search, notifications });
await bus.publish(companyCreated, { companyId, name, industry, createdBy });
```

See `examples/crm-events/` and `@kamod-ch/otok-events/crm`.

## Testing

```ts
import { createTestEventBus, FakeClock } from "@kamod-ch/otok-events/testing";

const testBus = createTestEventBus({ clock: new FakeClock() });
```

## Docs

- [Transaction boundaries](./docs/transactions.md)
- [Event versioning](./docs/versioning.md)
