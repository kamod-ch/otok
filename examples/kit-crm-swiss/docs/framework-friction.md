# Framework Friction Log

Issues discovered while building the Swiss CRM reference product.  
**Rule:** Fix in Otok packages where possible; avoid app-only workarounds.

## Fixed in Otok packages

| Issue | Fix | Package |
|-------|-----|---------|
| No Zefix/LINDAS import format | `parseZefixJson`, `importZefixRecords`, UID normalization | `@kamod-ch/otok-kit-crm` |
| No `otok-search` package | New `@kamod-ch/otok-search` with index + plugin | `@kamod-ch/otok-search` |
| Company schema missing address/source fields | Extended types + migration `002_extended.sql` | `@kamod-ch/otok-kit-crm` |
| Composable loaders (auth + kysely) | `composeLoader` + `loaderEnhancer` in `otok/route`; `withDb()` in `@kamod-ch/otok-kysely/loader` | `otok`, `@kamod-ch/otok-kysely` |
| Kit CRM Postgres adapter | `@kamod-ch/otok-kit-crm/db` — `KyselyCrmRepository` + types | `@kamod-ch/otok-kit-crm` |
| Workflow enrichment on import | `onCompanyImported` hook + `company.enrich` in `otok.config.ts` | reference app + `@kamod-ch/otok-workflows` |
| Kamod UI in reference app | `@kamod-ch/otok-kamod`, `@kamod-ch/ui`, `CrmShell` layout | reference app |

## Open — needs framework work

### P1: Composable loaders (auth + kysely + i18n)

**Status:** Partially addressed — `composeLoader` ships in `otok/route`; CRM uses `composeLoader` + `withDb` + `loaderEnhancer`. i18n loader wrapper still manual.

**Remaining:** Document ADR; optional `withAuth()` enhancer in `@kamod-ch/otok-auth/loader`.

### P1: Kit CRM Postgres adapter

**Status:** Fixed — use `@kamod-ch/otok-kit-crm/db` (`KyselyCrmRepository`).

## Open — needs framework work (continued)

### P2: Tenant context in loaders

**Problem:** No standard `ctx.tenantId` from auth session. Hardcoded org IDs in early kit routes.

**Workaround:** Map session user → `orgId` in app auth layer.

**Proposed fix:** Auth plugin optional `getTenantId(user)` injected into loader context.

### P2: Audit plugin ↔ domain events

**Problem:** `@kamod-ch/otok-audit` exposes HTTP search/export but CRM repository writes to local `crm_audit_log` table instead of audit plugin store.

**Workaround:** Dual audit (DB table + optional audit plugin API).

**Proposed fix:** Document canonical pattern: `recordAction()` in actions + Kysely provider for audit plugin.

### P2: Workflow enrichment integration

**Status:** Fixed — import triggers `company.enrich`; company detail has manual enrich action.

### P3: i18n in kit routes

**Problem:** Kit CRM routes use hardcoded German strings. i18n plugin loaded but not used in reference routes (plain Preact, no Kamod).

**Proposed fix:** Kit routes use `@kamod-ch/otok-i18n/loader` + `@kamod-ch/otok-kit-crm/i18n` messages.

### P3: Validation on actions

**Problem:** Forms use manual `String(formData.get(...))` instead of `defineAction` from `@kamod-ch/otok-validation`.

**Proposed fix:** Reference app should migrate actions to validation loader; document in kit-crm extension points.

## How to use this log

When fixing an item, move it to **Fixed** with PR link and remove app workaround if possible.
