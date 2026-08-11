# create-otok

Scaffold [Otok](https://github.com/kamod-ch/otok) apps with presets, optional layers, and a reproducible version matrix.

```bash
pnpm create otok@latest my-app
npm create otok@latest my-app -- --yes --variant saas
bun create otok@latest my-app
```

See [docs/cli.md](./docs/cli.md), [docs/presets.md](./docs/presets.md), and [Using Otok with AI coding agents](../../docs/ai-coding-agents.md).

## AI coding agents

Generate a public-schema `ai.json` manifest and companion agent docs:

```bash
pnpm create otok@latest my-app --ai-json true
```

Otok-specific guidance is written to normal documentation files, not to vendor-specific `ai.json` properties.

## Variants

`minimal`, `content`, `kamod`, `dashboard`, `saas`, `crm`, `api`

## Development

```bash
pnpm --filter create-otok generate:versions
pnpm --filter create-otok test
```
