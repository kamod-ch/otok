---
title: Plugin setup hooks
section: Guides
order: 36
---
# Plugin setup hooks

When users run `otok add`, the CLI can run a **setup hook** exported by your package. Setup hooks perform controlled, declarative project changes — example config, env vars, directories — without overwriting arbitrary files.

## Contract

Define a setup hook with `defineSetup` from `@otok/config` (or `otok`):

```ts
// setup.ts
import { defineSetup } from "@otok/config";

export default defineSetup(({ root, packageName, dryRun }) => ({
  changes: [
    {
      kind: "append-file",
      path: ".env.example",
      content: "\n# OAuth\nGITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=\n",
    },
    {
      kind: "create-file",
      path: "config/oauth.example.ts",
      content: "export const oauthExample = {};\n",
    },
    {
      kind: "mkdir",
      path: "migrations",
    },
    {
      kind: "tsconfig-types",
      types: ["@kamod-ch/otok-oauth/types"],
    },
  ],
}));
```

Register the entry point in `package.json`:

```json
{
  "otok": {
    "setup": "./dist/setup.js"
  },
  "exports": {
    "./setup": {
      "types": "./dist/setup.d.ts",
      "default": "./dist/setup.js"
    }
  }
}
```

After `otok add`, the CLI loads `package.json` → `otok.setup`, imports the module, and applies `changes`.

## Allowed operations

| Kind | Purpose | Restrictions |
|------|---------|----------------|
| `append-file` | Append lines | Only `.env.example` and `.env.local.example` |
| `create-file` | Create a new file | Only under `config/`, `src/config/`, `migrations/`, or env example files; **never** if the file already exists |
| `mkdir` | Create directories | Path must stay inside the project |
| `tsconfig-types` | Add `compilerOptions.types` | Merges into existing `tsconfig.json` |

Paths must be **relative** to the project root. Absolute paths and `../` escapes are rejected.

## Safety rules

The CLI validates every change before applying it:

- **No overwrites** — `create-file` fails if the target exists (user may confirm skip in interactive mode).
- **No unknown targets** — append/create outside allowed paths throws `PluginSetupValidationError`.
- **Idempotent config** — `otok.config.ts` edits are handled by the CLI, not the setup hook.
- **`dryRun`** — when the user passes `--dry-run`, your hook still runs but the CLI only prints planned setup steps.

Plugins must **not** write directly to the filesystem in the setup hook. Return `changes` and let the CLI apply them.

## Context

```ts
interface PluginSetupContext {
  root: string;       // absolute project root
  packageName: string;
  dryRun: boolean;
}
```

## Example: `@otok/plugin-fixture`

The test fixture plugin ships a minimal setup hook that appends to `.env.example` and creates `config/fixture/`. See `packages/otok-plugin-fixture/src/setup.ts` in the repository.

## Testing your hook

Unit-test the hook by calling it and passing the result to `validateSetupChanges`:

```ts
import { validateSetupChanges } from "@otok/config";
import setup from "./setup.js";

const result = await setup({ root: "/tmp/app", packageName: "@scope/pkg", dryRun: true });
validateSetupChanges("/tmp/app", result.changes ?? []);
```

Integration-test with:

```bash
pnpm otok add @your/plugin --dry-run
```

## See also

- [CLI — otok add](./cli-add.md)
- [Create your first plugin](./create-your-first-plugin.md)
