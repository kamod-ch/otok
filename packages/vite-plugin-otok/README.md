# @kamod-ch/otok-vite-plugin

Vite plugin for Otok file routes, typed route helpers, route middleware discovery, and Preact islands.

Use this package from an Otok app's `vite.config.ts`.

## Island registry keys

Each island file contributes a **PascalCase registry id** and, for `$`-prefixed route islands, an additional **alias key** (basename without `$`). Both keys must be unique across the whole app — duplicate basenames in different folders, or an alias that collides with another file's id/alias, **fail the build** with both file paths in the error. Rename one of the files locally; the plugin does not pick a silent winner.
