# Migrating toward Otok 2.x (repository line)

This guide summarizes **documented, in-repo** differences when moving from early 0.x narratives to the current `@kamod-ch/otok` **2.0.0** workspace line. It does **not** guarantee that every version is published to npm — check the registry before upgrading production apps.

## Package names

| Legacy / informal | Current |
|-------------------|---------|
| npm name `otok` | **`@kamod-ch/otok`** (legacy name may appear as a registry alias only — do not keep both in `package.json`) |
| Unscoped adapters | **`otok-adapter-node`**, **`otok-adapter-cloudflare`**, **`otok-adapter-static`** (still unscoped) |
| Vite integration | **`@kamod-ch/otok-vite-plugin`** |
| CLI | **`otok-cli`** (unscoped) |

Use `otok upgrade --dry-run` with `OTOK_REGISTRY_OFFLINE=1` to compare installed versions against the **bundled registry snapshot** in `@kamod-ch/otok-registry`. Snapshot targets are repo metadata, not a claim that npm serves those tarballs yet.

## Import paths

Server code should import from **`@kamod-ch/otok/server`**. Older `otok/server` paths are legacy; `otok doctor` flags them in client bundles.

## Documentation map

- **Current status:** [status.md](./status.md)
- **Historical RC / stabilization:** [release-candidate.md](../1.0/release-candidate.md), [stabilization/status.md](../stabilization/status.md) — read the dated banners; do not treat old version numbers as live.

## Scaffold and peers

`create-otok` templates pin `@kamod-ch/otok` and peers to the **2.x** line. After cloning an example, run `pnpm install` and your package manager’s outdated view — do not assume template pins match npm’s latest publish without checking.
