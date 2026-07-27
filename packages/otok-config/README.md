# @otok/config

Typed plugin API and config resolution for [Otok](https://github.com/kamod-ch/otok) apps.

## Public API

- `defineConfig(config)` — declare `otok.config.ts`
- `definePlugin(setup)` — author Otok plugins
- `resolveOtokConfig(config, env)` — resolve plugins programmatically
- `PluginContainer` — hook orchestration (advanced/testing)

Re-exported from `otok` and `otok/config`.

## Hook order

1. Validate plugin names and options (`schema`)
2. `config` — plugin 1 → N, merged into user config
3. `configResolved` — plugin 1 → N
4. `configureVite` — plugin 1 → N
5. Dev: `configureServer` — plugin 1 → N
6. Build: `buildStart` 1 → N, `buildEnd` N → 1
7. Runtime: `configureApp` — plugin 1 → N

## Virtual modules

Plugins may register modules under:

```text
virtual:otok-plugin/<plugin-name>/<module-id>
```

The Vite plugin exposes resolved runtime config through `virtual:otok-config`.
