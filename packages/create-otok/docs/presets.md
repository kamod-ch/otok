# Otok presets

Presets compose starters, optional layers, configuration patches, and file copies into reproducible scaffolds.

## Authoring API

```ts
import { definePreset } from "otok";

export default definePreset({
  name: "@kamod-ch/otok-preset-saas",
  starter: "saas",
  otok: "^0.4.0",
  extends: "@kamod-ch/otok-preset-minimal",
  plugins: [],
  config: {},
  routes: [],
  layouts: [],
  components: [],
  styles: [],
  middleware: [],
  files: [{ from: "Dockerfile", to: "Dockerfile" }],
  envSchema: { DATABASE_URL: "string" },
  packageJson: {
    dependencies: { zod: "^3.24.0" },
  },
  overwrite: {
    "src/server.ts": "replace",
  },
});
```

Import `definePreset` from `otok` or `@kamod-ch/otok-config`. Preset modules should stay **server/tooling safe** — no browser-only imports in preset definition files.

## Merge order (deterministic)

1. Resolve `extends` depth-first (bases before derived).
2. Apply the selected variant preset.
3. Apply CLI-selected layers in sorted order.
4. Later presets win path conflicts unless `overwrite` specifies otherwise.

## Conflict rules

| Strategy | Behavior |
|----------|----------|
| `replace` (default) | Later file entry replaces earlier for the same destination |
| `skip` | Keep the first file written |
| `merge` | Reserved for JSON merges (package.json uses deep merge) |

`packageJson` patches always deep-merge: dependencies, devDependencies, and scripts combine with later keys winning.

## Official presets

| Package | Starter key |
|---------|-------------|
| `@kamod-ch/otok-preset-minimal` | `minimal` |
| `@kamod-ch/otok-preset-kamod` | `kamod` |
| `@kamod-ch/otok-preset-dashboard` | `dashboard` |
| `@kamod-ch/otok-preset-saas` | `saas` |
| `@kamod-ch/otok-preset-crm` | `crm` |

Built-in registry in `create-otok` mirrors these packages so `pnpm create otok` works without installing preset packages separately.

## Local and package presets

- **Built-in:** `create-otok/src/registry.ts`
- **npm package:** export `default` from `@kamod-ch/otok-preset-*` and reference via `--preset @kamod-ch/otok-preset-saas`
- **Local:** publish a preset package in your monorepo and pass `--preset` after linking

## Version compatibility

Each preset may declare `otok: "^0.4.0"`. The scaffold CLI pins runtime packages from `versions.json` to match the published create-otok release.

## Update strategy

1. Bump otok / plugin versions in the monorepo.
2. Run `pnpm --filter create-otok generate:versions`.
3. Update starter templates only when structure changes — avoid duplicating starters; add **layers** for optional features.
4. Extend `test/preset-matrix.test.mjs` when adding variants or layers.
