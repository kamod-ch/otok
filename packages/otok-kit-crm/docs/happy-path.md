# CRM happy path

From empty directory to a running Swiss CRM:

```bash
pnpm create otok my-crm --variant crm
cd my-crm
pnpm install
pnpm typecheck
pnpm dev
```

`--variant crm` auto-composes `@kamod-ch/otok-kit-crm` with modules `pipelines` and `import-export` (`PRESET_KIT_MAP`).

## What you get

| Path                      | Source                         |
| ------------------------- | ------------------------------ |
| `/crm`                    | Company list / search          |
| `/crm/companies/:id`      | Company detail                 |
| `/crm/pipelines`          | Optional module                |
| `/crm/import`             | Optional module                |
| `.otok/kit-manifest.json` | Applied kit files + migrations |

## Add Kamod UI

The kit routes are plain HTML. For Kamod Tailwind/theme:

```ts
import kamod from "@kamod-ch/otok-kamod";

export default defineConfig({
  plugins: [kamod({ theme: "default", icons: true, forms: true })],
});
```

Or start from `pnpm create otok --variant kamod` and add `--kit @kamod-ch/otok-kit-crm`.

Reference: [examples/kit-crm-swiss](../../../examples/kit-crm-swiss) (Kamod + auth + Kysely + E2E).

## Compose admin

```bash
pnpm create otok my-crm --variant crm --kit @kamod-ch/otok-kit-admin
```

CRM + admin do not conflict. Admin + marketplace **do** (`conflicts` on the admin kit).
