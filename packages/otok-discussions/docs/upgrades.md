# Upgrade & migration strategy

## Applying SQL schema

```ts
import { migrateDiscussionsSchema } from "@kamod-ch/otok-discussions/kysely";

await migrateDiscussionsSchema(db, "postgres", "up"); // or "sqlite", "down"
```

Run **once per environment** before enabling the plugin. App-owned tables (users, subjects) stay in your migrations; only `discussions_*` tables are owned by this package.

## Version 0.1.0 (initial)

- Migration id: `20260926120000_discussions_initial`
- Tables: threads, comments, revisions, reactions, reports, moderation_actions, blocks
- Partial unique indexes: one active reaction per actor/comment; one open report per reporter/target

## Future breaking changes (policy)

When a release changes schema or status enums:

1. Ship a **new** migration (never edit applied migrations).
2. Add a section here with:
   - Required downtime (if any)
   - Backfill SQL
   - Config defaults for new fields
3. Bump **minor** for additive schema; **major** for removed/changed public types or irreversible data moves.

## Status model compatibility

Thread statuses: `scheduled`, `open`, `read_only`, `closed`, `archived`.  
Comment statuses: `pending`, `published`, `rejected`, `hidden`, `deleted`.

Effective thread status may differ from stored row when `opensAt` / `closesAt` elapse (`resolveEffectiveThreadStatus`). Upgrades must preserve ISO timestamps on those columns.

## Rolling deploys

- **Single instance:** Safe after migration applied.
- **Multi-instance:** Use DB-backed idempotency for POST actions (Otok `_otokIdempotencyKey`); reaction uniqueness enforced in DB.
- **Cache:** Default plugin rendering is `noStore`; opt-in public cache requires `setOtokCacheScope({ tenantId })` per request (see `docs/security-production.md`).
