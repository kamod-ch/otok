# Migration Guide: Otok 0.4.x → 1.0.0

This guide covers upgrading from the last **0.4.x** release to **1.0.0**.

> **Compatibility decision:** Otok 1.0 preserves Public APIs from 0.4.x. Breaking changes are limited to Experimental surfaces (presets/kits) and documented deprecations.

## Before you upgrade

```bash
otok doctor
otok outdated
```

Fix errors reported by doctor before proceeding.

## 1. Update core packages

```bash
pnpm add otok@^1.0.0 @otok/vite-plugin@^1.0.0
pnpm add -D otok-cli@^1.0.0
```

Or with npm:

```bash
npx otok upgrade --dry-run
npx otok upgrade
```

Linked packages (`otok`, `@otok/vite-plugin`, `create-otok`) share the same major.

## 2. Update adapters

Adapters at `1.0.0` remain compatible:

```bash
pnpm add otok-adapter-node@^1.0.0
# or cloudflare / static
```

No adapter API changes in 1.0.

## 3. Update plugins

Check registry compatibility:

```bash
otok info kysely
otok info auth
```

Update each plugin to the version supporting `otokVersion: ^1.0.0`:

```bash
pnpm add @kamod-ch/otok-kysely@latest @kamod-ch/otok-auth@latest
```

Plugins with independent semver may stay on current major if registry range allows.

## 4. Config changes

### No change required (typical app)

```ts
import { defineConfig } from "otok";
import node from "otok-adapter-node";

export default defineConfig({
  adapter: node(),
  plugins: [/* ... */],
});
```

### Experimental: presets and kits

If using `@otok/preset-*` or `@otok/kit-*`, review [business-kits.md](../business-kits.md). Kit merge API remains Experimental — minor API adjustments possible in 1.0.x.

## 5. Route types

Regenerate after upgrade:

```bash
otok typegen
```

Or:

```bash
otok doctor --fix
```

## 6. Deprecated APIs

| Deprecated (0.4) | Replacement (1.0) | Removal |
|------------------|-------------------|---------|
| None at 0.4 GA | — | — |

New deprecations will be listed in CHANGELOG and `otok doctor` output.

## 7. Node.js

Minimum Node **20**. Node **22** recommended.

## 8. Verify

```bash
pnpm build
pnpm test
otok doctor
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Plugin compat error | `otok info <plugin>` — check `otokVersion` |
| Missing route types | `otok typegen` |
| Client leak warning | Move server imports out of `src/client` |
| Adapter not detected | Add `otok-adapter-*` to dependencies |

## Getting help

- [GitHub Discussions](https://github.com/kamod-ch/otok/discussions)
- [Docs site](https://kamod-ch.github.io/otok/)
- Security: security@kamod.ch
