# @kamod-ch/otok-audit

Immutable audit trail for Otok applications — actor, action, resource, changes, multi-tenant search and export.

## Quick start

```ts
import audit from "@kamod-ch/otok-audit/plugin";

export default defineConfig({
  plugins: [audit({ defaultTenantId: "default" })],
});
```

```ts
import { audit, withAuditActor, defineAuditAction } from "@kamod-ch/otok-audit";

await withAuditActor({ id: userId, type: "user" }, async () => {
  await audit.record({
    tenantId: orgId,
    action: "company.updated",
    resource: { type: "company", id: companyId },
    changes: { before: oldData, after: newData },
  });
});
```

## Features

- **Actor, action, resource, timestamp, changes** — full audit record model
- **Multi-tenant** — all queries scoped by `tenantId`
- **Immutable** — append-only store (no update/delete)
- **Redaction** — global and per-action sensitive field masking
- **Search** — filter by action, resource, actor, time range, full-text
- **Export** — JSON and CSV download via plugin routes

## Providers

| Provider | Module | Use case |
|----------|--------|----------|
| Memory | built-in | Development and tests |
| Kysely | `@kamod-ch/otok-audit/providers/kysely` | SQLite / PostgreSQL |

## CRM example

```ts
import { companyUpdated, audit } from "@kamod-ch/otok-audit/crm";

await audit.recordAction(companyUpdated, {
  tenantId: "org-1",
  actor: { id: userId, type: "user" },
  resource: { id: companyId },
  changes: { before: old, after: updated },
});
```

## HTTP routes (plugin)

- `GET /audit/search?tenantId=...` — paginated search
- `GET /audit/export?tenantId=...&format=json|csv` — export download

Secure these routes with your app's auth middleware.
