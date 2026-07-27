---
title: CLI — otok add
section: Guides
order: 35
---
# CLI — `otok add`

Install Otok plugins from the command line. The CLI detects your package manager, installs the npm package, and registers the plugin in `otok.config.ts` without reformatting the whole file.

## Quick start

```bash
pnpm otok add oauth
pnpm otok add i18n
pnpm otok add kysely
pnpm otok add @scope/custom-plugin
```

If `otok-cli` is not installed globally, use `pnpm dlx otok-cli add …` or add it as a dev dependency.

## Official aliases

Short names map to published packages:

| Alias | Package |
|-------|---------|
| `oauth` | `@kamod-ch/otok-oauth` |
| `i18n` | `@kamod-ch/otok-i18n` |
| `kysely` | `@kamod-ch/otok-kysely` |
| `seo` | `@kamod-ch/otok-seo` |
| `kamod` | `@kamod-ch/otok-kamod` |

You can also pass a full scoped name (`@scope/custom-plugin`) or an unscoped `otok-*` name (resolved to `@kamod-ch/otok-*`).

## What the command does

1. Finds the Otok project root (`package.json` plus `otok.config.ts` or `vite.config.ts`).
2. Detects npm, pnpm, yarn, or bun from lockfiles.
3. Installs the package (unless `--skip-install`).
4. Adds an import and `plugins: […]` entry to `otok.config.ts`.
5. Runs an optional plugin setup hook (see [Plugin setup hooks](./plugin-setup-hooks.md)).

Existing plugins are not duplicated. Running `otok add` twice for the same package is safe.

## Options

### `--dry-run`

Print install and file changes without modifying the project:

```bash
pnpm otok add oauth --dry-run
```

### `--skip-install`

Update configuration only — useful in monorepos or when the package is already present:

```bash
pnpm otok add @otok/plugin-hello --skip-install
```

## Missing config file

If `otok.config.ts` does not exist, the CLI creates one from the default template before registering the plugin.

## Interactive prompts

Confirmation is requested only for ambiguous or risky changes, for example:

- Import identifier collision with an existing symbol
- Plugin setup wants to create a new file

Non-interactive environments (CI) skip creation steps that require confirmation.

## Errors

| Situation | Message |
|-----------|---------|
| Not in an Otok project | Could not find an Otok project |
| Unknown alias | Lists official aliases |
| Config without `defineConfig` | Manual wiring instructions |
| Setup tries to overwrite a file | Refusing to overwrite existing file |

## See also

- [Plugins](./plugins.md)
- [Plugin setup hooks](./plugin-setup-hooks.md)
- [Composition packages](./extensions.md)
