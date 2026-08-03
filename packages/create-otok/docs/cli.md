# create-otok CLI

Production scaffold for [Otok](https://github.com/kamod-ch/otok) applications.

```bash
pnpm create otok@latest my-app
npm create otok@latest my-app
bun create otok@latest my-app
```

## Variants

| Variant | Description |
|---------|-------------|
| `minimal` | Counter demo, no UI library |
| `content` | Blog / marketing content site |
| `kamod` | Kamod UI + Tailwind via `@kamod-ch/otok-kamod` |
| `dashboard` | Admin dashboard components |
| `saas` | Auth, i18n, Kysely, validation, security, SEO |
| `crm` | CRM demo with mutations (`useAction` / `useFetcher`) |
| `api` | Hono JSON API + minimal docs UI |

## Non-interactive flags

```bash
pnpm create otok@latest my-saas \
  --yes \
  --variant saas \
  --adapter node \
  --docker true \
  --github-actions true \
  --no-install
```

| Flag | Description |
|------|-------------|
| `--variant`, `--template` | Project variant (see table above) |
| `--preset` | Named preset (e.g. `@otok/preset-saas`) |
| `--adapter` | `node`, `cloudflare`, or `static` |
| `--database` | `none`, `sqlite`, `postgres` (with `--kysely`) |
| `--auth`, `--i18n`, `--kysely`, `--validation`, `--testing` | Optional layers |
| `--docker`, `--github-actions` | Deployment / CI layers |
| `--layer <name>` | Repeatable extra layer preset |
| `--install` / `--no-install` | Run package manager install |
| `--git` | `git init` after scaffold |
| `--force` | Allow non-empty target directory |
| `--dry-run` | Print preset chain without writing files |
| `--smoke` | Run typecheck smoke test after scaffold |
| `--yes`, `-y` | Skip interactive prompts |

## Package manager detection

Install commands use the lockfile in the **current working directory** (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`) or `npm_config_user_agent`.

## Version matrix

Compatible dependency versions live in `versions.json`, generated from the monorepo:

```bash
node packages/create-otok/scripts/generate-versions.mjs
```

Starters are patched at scaffold time so new projects receive current compatible versions.

## Presets

See [presets.md](./presets.md) for `definePreset`, merge rules, and authoring official presets.

## Smoke tests

CI runs matrix tests (`test/preset-matrix.test.mjs`) that scaffold every variant and verify deterministic file trees. Use `--smoke` locally to run typecheck after scaffold.
