# otok-cli

CLI for Otok apps — install plugins, search the extension registry, and diagnose project health.

## Usage

```bash
pnpm dlx otok-cli add oauth
pnpm dlx otok-cli search storage
pnpm dlx otok-cli info otok-kysely
pnpm dlx otok-cli doctor
pnpm dlx otok-cli outdated
```

When installed locally in a project:

```bash
pnpm otok add kysely
pnpm otok search auth --official
pnpm otok doctor --fix
```

## Registry commands

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `search <query>`   | Search extensions by name, keyword, or alias |
| `info <extension>` | Show registry metadata and compatibility     |
| `outdated`         | Compare installed versions with registry     |
| `doctor`           | Read-only health checks (optional `--fix`)   |

Set `OTOK_REGISTRY_OFFLINE=1` to use the bundled registry only. See [@kamod-ch/otok-registry](../otok-registry/docs/users.md) for details.

## Upgrade

```bash
pnpm otok upgrade --dry-run
pnpm otok upgrade --core-only --json
```

`otok upgrade` resolves target versions from the bundled registry snapshot (offline when `OTOK_REGISTRY_OFFLINE=1`). It upgrades `@kamod-ch/otok`, `@kamod-ch/otok-vite-plugin`, `otok-cli`, and the unscoped `otok-adapter-*` packages together when you pass `--core-only`. Extension plugins are included only in the default (full) mode.

Legacy npm name `otok` is treated as an alias of `@kamod-ch/otok`; do not keep both in `package.json`. Workspace, link, and git version specs are reported as diagnostics — the CLI will not claim “up to date” when targets cannot be resolved.

## Add options

| Flag             | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `--dry-run`      | Print planned changes without writing files or running install |
| `--skip-install` | Update `otok.config.ts` only; skip package manager install     |

`otok add` runs registry compatibility checks before install (Otok version, adapter, deprecation, security notes).

## Official aliases

| Alias     | Package                  |
| --------- | ------------------------ |
| `oauth`   | `@kamod-ch/otok-oauth`   |
| `i18n`    | `@kamod-ch/otok-i18n`    |
| `kysely`  | `@kamod-ch/otok-kysely`  |
| `storage` | `@kamod-ch/otok-storage` |
| `kamod`   | `@kamod-ch/otok-kamod`   |

See the [CLI add guide](https://github.com/kamod-ch/otok/blob/main/apps/docs/content/guides/cli-add.md) in the docs app.
