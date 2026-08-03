# create-otok

Scaffold [Otok](https://github.com/kamod-ch/otok) apps with presets, optional layers, and a reproducible version matrix.

```bash
pnpm create otok@latest my-app
npm create otok@latest my-app -- --yes --variant saas
bun create otok@latest my-app
```

See [docs/cli.md](./docs/cli.md) and [docs/presets.md](./docs/presets.md).

## Variants

`minimal`, `content`, `kamod`, `dashboard`, `saas`, `crm`, `api`

## Development

```bash
pnpm --filter create-otok generate:versions
pnpm --filter create-otok test
```
