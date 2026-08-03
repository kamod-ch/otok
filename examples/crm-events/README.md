# CRM events example

Demonstrates `@kamod-ch/otok-events` with the CRM domain:

- `company.created` → auto activity, search index update, in-app notification
- Correlation/causation chaining across child events
- Idempotent consumers

See `demo.ts` and package tests in `packages/otok-events/src/crm/`.
