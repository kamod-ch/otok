# Extension points — @kamod-ch/otok-kit-crm

## Domain layer (preferred override surface)

```ts
import { CrmService, seedSwissDemo, SWISS_DEMO_ORG_ID } from "@kamod-ch/otok-kit-crm";
```

Replace in-memory store with Kysely adapter in your app — keep `CrmService` API.

## Routes

Override without eject:

```ts
mergeKits([crmKit], registry, {
  overrides: [{ from: "./my/crm/index.tsx", to: "src/app/routes/crm/index.tsx" }],
});
```

## Modules

| Module          | When to enable            | Routes           | Permissions                             |
| --------------- | ------------------------- | ---------------- | --------------------------------------- |
| `pipelines`     | Sales pipeline UI         | `/crm/pipelines` | `crm:pipelines:read`                    |
| `import-export` | CSV company import/export | `/crm/import`    | import + export                         |
| `notifications` | CRM notification hooks    | hooks only       | requires `@kamod-ch/otok-notifications` |

`create otok --variant crm` enables `pipelines` and `import-export` via `PRESET_KIT_MAP`.

## Integrations

| Extension                      | Hook                                               |
| ------------------------------ | -------------------------------------------------- |
| `@kamod-ch/otok-audit`         | Record on company update/import                    |
| `@kamod-ch/otok-search`        | Index companies on change                          |
| `@kamod-ch/otok-export`        | XLSX background export                             |
| `@kamod-ch/otok-notifications` | Enable `notifications` module                      |
| `@kamod-ch/otok-kamod`         | Replace plain HTML in routes with Kamod components |

Reference apps with Kamod wired: `examples/kit-crm-swiss` (`kamod()` in `otok.config.ts`) and `create-otok/otok-starter-crm`.

## Swiss API conventions

- **UID** — `CHE-xxx.xxx.xxx` on companies and orgs
- **Canton** — 2-letter codes (ZH, BE, VD, …)
- **Legal form** — AG, GmbH, Genossenschaft, …
- **Locale** — `de` default; contacts carry `language`
- **Timezone** — `Europe/Zurich`

## Migrations

| Id                            | File               | Notes                                                                                                                   |
| ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `20260803120000_crm_initial`  | `001_initial.sql`  | Core tables — SQLite and PostgreSQL                                                                                     |
| `20260803140000_crm_extended` | `002_extended.sql` | Extra columns, sources, websites, contact requests, audit log — **PostgreSQL** (`IF NOT EXISTS` / partial unique index) |

Apply via your migration runner in id order; SQL lives in this package. Skip `002` on SQLite until you rewrite it for that dialect.
