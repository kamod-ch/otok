# otok-cli

CLI for Otok apps. Installs plugins and registers them in `otok.config.ts`.

## Usage

```bash
pnpm dlx otok-cli add oauth
pnpm dlx otok-cli add i18n
pnpm dlx otok-cli add @scope/custom-plugin
```

When installed locally in a project:

```bash
pnpm otok add oauth
```

## Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Print planned changes without writing files or running install |
| `--skip-install` | Update `otok.config.ts` only; skip package manager install |

## Official aliases

| Alias | Package |
|-------|---------|
| `oauth` | `@kamod-ch/otok-oauth` |
| `i18n` | `@kamod-ch/otok-i18n` |
| `kysely` | `@kamod-ch/otok-kysely` |
| `seo` | `@kamod-ch/otok-seo` |
| `kamod` | `@kamod-ch/otok-kamod` |

See the [CLI add guide](https://github.com/kamod-ch/otok/blob/main/apps/docs/content/guides/cli-add.md) and [plugin setup hooks](https://github.com/kamod-ch/otok/blob/main/apps/docs/content/guides/plugin-setup-hooks.md) in the docs app.

## Package manager detection

Lockfiles in the project root determine the install command:

- `pnpm-lock.yaml` → `pnpm add`
- `yarn.lock` → `yarn add`
- `bun.lock` / `bun.lockb` → `bun add`
- otherwise → `npm install`
