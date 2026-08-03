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
import { createKyselyOutboxStore } from "@kamod-ch/otok-events/outbox/kysely";

await db.transaction().execute(async (trx) => {
  await trx.insertInto("companies").values(row).execute();
  await enqueueOutboxEvent(createKyselyOutboxStore(trx), companyCreated, payload, metadata);
});
await processor.processOnce();
```

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
