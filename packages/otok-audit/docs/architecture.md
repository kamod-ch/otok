# Architecture

## Model

Each audit entry captures:

| Field | Description |
|-------|-------------|
| `tenantId` | Organization / tenant scope |
| `actor` | Who performed the action (`user`, `system`, `api_key`, …) |
| `action` | Dot-notation verb (`company.updated`) |
| `resource` | What was affected (`type` + `id`) |
| `changes` | Field-level or before/after snapshot |
| `occurredAt` | ISO timestamp |
| `requestId` / `correlationId` | Trace linkage |

## Immutability

`AuditStore` exposes only:

- `append(entry)` — insert new record
- `getById(id, tenantId)` — read single entry
- `search(query)` — read filtered list

There is **no update or delete**. Tamper-evidence is enforced at the store contract level.

## Context propagation

```ts
withAuditTenant(tenantId, () =>
  withAuditActor(actor, () =>
    withAuditRequestId(requestId, () => audit.record({ ... }))
  )
);
```

Context merges with explicit `RecordAuditInput` fields (input wins for overrides).

## Redaction

Configure globally via plugin `redactFields` or per-action via `defineAuditAction({ redactFields })`. Applied on read paths (search, export, record return value).

## Export

Built-in JSON/CSV export for compliance downloads. For XLSX, streaming large exports, and background jobs, use `@kamod-ch/otok-export` (Tier 1 #2).

## Integration with otok-events

Subscribe to domain events and call `audit.record()` in handlers for automatic audit trails:

```ts
events.subscribe(companyUpdatedEvent, async (event) => {
  await audit.record({
    tenantId: event.payload.orgId,
    action: event.name,
    resource: { type: "company", id: event.payload.id },
    changes: event.payload.changes,
  });
});
```
