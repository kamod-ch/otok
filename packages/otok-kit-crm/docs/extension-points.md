# Extension points — @otok/kit-crm

## Domain layer (preferred override surface)

```ts
import { CrmService, seedSwissDemo, SWISS_DEMO_ORG_ID } from "@otok/kit-crm";
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

| Module | Routes | Permissions |
|--------|--------|-------------|
| `pipelines` | `/crm/pipelines` | `crm:pipelines:read` |
| `import-export` | `/crm/import` | import + export |
| `notifications` | hooks only | — |

## Integrations

| Extension | Hook |
|-----------|------|
| `@kamod-ch/otok-audit` | Record on company update/import |
| `@kamod-ch/otok-search` | Index companies on change |
| `@kamod-ch/otok-export` | XLSX background export |
| `@kamod-ch/otok-notifications` | Enable `notifications` module |
| `@kamod-ch/otok-kamod` | Replace plain HTML in routes with Kamod components |

## Swiss API conventions

- **UID** — `CHE-xxx.xxx.xxx` on companies and orgs
- **Canton** — 2-letter codes (ZH, BE, VD, …)
- **Legal form** — AG, GmbH, Genossenschaft, …
- **Locale** — `de` default; contacts carry `language`
- **Timezone** — `Europe/Zurich`

## Migrations

`20260803120000_crm_initial` — apply via your migration runner; SQL in `@otok/kit-crm` package.
