# Otok Business Kits

Composable, eject-free application layers built on `@otok/config` preset/kit merge.

## Principles

| Principle | How |
|-----------|-----|
| **Composable** | `mergeKits([crmKit, adminKit], { enabledModules })` |
| **Overridable** | App `overrides` win via `KitComposeOptions.overrides` — no eject |
| **Conflict detection** | `detectKitConflicts()` — incompatible kits, duplicate routes/migrations |
| **Traceable migrations** | Each kit ships `migrations[]` with monotonic ids |
| **Optional modules** | Enable per kit: `pipelines`, `import-export`, … |
| **No Kamod coupling** | Kamod UI is optional peer; kits use plain HTML by default |
| **Version checks** | `requires[]` validated via `checkKitVersions()` |

## Kits

| Kit | Package | Description |
|-----|---------|-------------|
| CRM | `@otok/kit-crm` | Swiss B2B CRM — full implementation |
| Admin | `@otok/kit-admin` | User/org admin shell |
| SaaS | `@otok/kit-saas` | Billing + subscription hooks |
| Marketplace | `@otok/kit-marketplace` | Listings + orders scaffold |
| Content | `@otok/kit-content` | CMS pages atop otok-content |

## Usage

```ts
import { mergeKits } from "@otok/config";
import crmKit from "@otok/kit-crm/kit";
import adminKit from "@otok/kit-admin/kit";

const plan = mergeKits([crmKit, adminKit], registry, {
  enabledModules: {
    "@otok/kit-crm": ["pipelines", "import-export"],
  },
  overrides: [
    { from: "local/routes/crm/index.tsx", to: "src/app/routes/crm/index.tsx" },
  ],
});

if (plan.conflicts.length) throw new Error(plan.conflicts[0]!.message);
```

### Scaffold integration

`create-otok` composes kits automatically for presets like `@otok/preset-crm`:

```bash
pnpm create otok my-crm --variant crm --no-install
```

This copies kit routes into `src/app/`, patches `package.json`, and writes `.otok/kit-manifest.json`.

Additional kits: `--kit @otok/kit-admin`

Local overrides without eject: configure `kitOverrides` in programmatic scaffold API.

1. Check `plan.versionMismatches` after bumping kit versions
2. Apply new migrations in `plan.migrations` order (tracked in `.otok/kit-manifest.json`)
3. Review `overwrite` conflicts when enabling new modules
4. Run kit package tests + app E2E before deploy

## Extension points

- **Domain API** — import from `@otok/kit-crm` (not kit-files)
- **Routes** — override single files via `overrides`
- **Config** — merge `plan.config` / `plan.plugins` into `otok.config.ts`
- **Permissions** — `plan.permissions` wired to app auth
- **i18n** — `@otok/kit-crm/i18n` (DE/FR/EN/IT)

See per-kit `docs/extension-points.md`.
