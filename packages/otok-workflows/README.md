# @kamod-ch/otok-workflows

Durable multi-step workflows for Otok — typed steps, retries, cron, pause/resume, and persistent providers.

## Example

```ts
export const enrichCompany = defineWorkflow({
  name: "company.enrich",
  input: companyInputSchema,
  run: async ({ input, step }) => {
    const website = await step.run("find-website", () => findWebsite(input));
    const contacts = await step.run("find-contacts", () => findContacts(website));
    return { website, contacts };
  },
});
```

Completed steps are **never re-executed** after a crash — outputs are replayed from the store.

## Plugin

```ts
import workflows from "@kamod-ch/otok-workflows/plugin";

plugins: [workflows({ workflows: { enrichCompany } })];
```

## API

```ts
const instance = await workflows.start(enrichCompany, input, { idempotencyKey: "import-acme" });
await workflows.resume(instance.id);
await workflows.cancel(instance.id);
const status = await workflows.status(instance.id);
```

## Providers

| Provider | Use case |
|----------|----------|
| `memory` | Development and tests |
| `kysely` | PostgreSQL / SQLite persistence |
| `cloud` | Extensible contract for AWS/GCP/CF |

## CRM example

See `@kamod-ch/otok-workflows/crm` — company import, website detection, contact enrichment, notification.
