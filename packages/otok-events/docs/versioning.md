# Event versioning and schema migration

Domain events are versioned explicitly via `defineEvent({ name, version })`.

## Naming convention

- Event name: dot-separated domain notation (`company.created`, `order.shipped`)
- Version: monotonically increasing integer starting at 1
- Full key: `company.created@v1`

## Adding a new version

When payload shape changes incompatibly, increment version:

```ts
export const companyCreatedV1 = defineEvent<CompanyCreatedV1>({
  name: "company.created",
  version: 1,
  schema: companyCreatedV1Schema,
});

export const companyCreatedV2 = defineEvent<CompanyCreatedV2>({
  name: "company.created",
  version: 2,
  schema: companyCreatedV2Schema,
});
```

Both versions can coexist during migration. Handlers subscribe to specific definitions:

```ts
bus.subscribe(companyCreatedV1, legacyHandler);
bus.subscribe(companyCreatedV2, currentHandler);
```

## Compatible changes (same version)

Safe without bumping version:

- Adding optional Zod fields with defaults
- Adding metadata fields (not in payload schema)

Unsafe — requires new version:

- Renaming payload fields
- Changing field types
- Removing required fields

## Outbox migration

Outbox rows store `event_name` + `event_version`. When deprecating v1:

1. Deploy v2 publishers and consumers
2. Drain v1 outbox entries via processor
3. Remove v1 handlers
4. Stop emitting v1

## Upcasting (optional pattern)

For read-side replay, implement an upcaster:

```ts
function upcastCompanyCreated(raw: unknown): CompanyCreatedV2 {
  const v1 = companyCreatedV1.schema!.parse(raw);
  return { ...v1, legalName: v1.name };
}
```

Keep upcasters in application code — otok-events stores payloads as published.

## Zod as Standard Schema

Event schemas use Zod 3, compatible with Standard Schema validators used elsewhere in Otok (`@kamod-ch/otok-validation`).

## Testing migrations

Use `TestEventBus` to publish both versions and assert handler compatibility:

```ts
const testBus = createTestEventBus();
testBus.bus.subscribe(companyCreatedV2, handler);
await testBus.publish(companyCreatedV2, v2Payload);
```

For outbox migrations, use transactional tests in `store.test.ts` as reference.
