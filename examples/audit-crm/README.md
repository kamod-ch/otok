# CRM audit example

Demonstrates company lifecycle auditing with `@kamod-ch/otok-audit`.

## Actions

- `company.created`
- `company.updated`
- `company.deleted`

Import from `@kamod-ch/otok-audit/crm`.

## Run tests

```bash
pnpm --filter @kamod-ch/otok-audit test
KYSELY_SQLITE_TESTS=1 pnpm --filter @kamod-ch/otok-audit test
```

## Plugin setup

```ts
import audit from "@kamod-ch/otok-audit/plugin";

plugins: [audit({ defaultTenantId: "demo-org", redactFields: ["email", "taxId"] })];
```

Secure `/audit/search` and `/audit/export` with admin-only middleware in production.
