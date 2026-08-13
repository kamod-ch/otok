---
title: Kamod integration
section: Guides
order: 28
---
# Kamod integration (`@kamod-ch/otok-kamod`)

Kamod UI, Tailwind, themes, and form helpers are **optional**. Otok core does not depend on Kamod.

## Install

```bash
pnpm otok add kamod
```

This installs `@kamod-ch/otok-kamod`, registers the plugin, and scaffolds `src/config/kamod.css`.

Manual install:

```bash
pnpm add @kamod-ch/otok-kamod @kamod-ch/ui @preact/signals
pnpm add -D tailwindcss @tailwindcss/vite
```

## Configure

```ts
import { defineConfig } from "@kamod-ch/otok";
import kamod from "@kamod-ch/otok-kamod";

export default defineConfig({
  plugins: [
    kamod({
      theme: "default",
      icons: true,
      forms: true,
    }),
  ],
});
```

Remove duplicate `tailwindcss()` from `vite.config.ts` — the Kamod plugin registers `@tailwindcss/vite`.

## CSS and themes

Default theme:

```css
@import "tailwindcss";
@import "@kamod-ch/ui/theme.css";
```

Brand presets require `@kamod-ch/themes`:

```ts
kamod({ theme: "kamod" })
```

```css
@import "tailwindcss";
@import "@kamod-ch/themes/theme.css";
@import "@kamod-ch/themes/brands/kamod.css";
```

Override CSS variables after the imports to customize tokens.

## Dark mode

`kamod()` sets Otok `theme: true` so SSR emits the blocking bootstrap script and `html.dark` from the theme cookie. For Kamod brand presets, add `KamodThemeHead` from `@kamod-ch/otok-kamod/theme` to route `head` exports.

## Icons (tree-shaking)

Import by subpath — only used icons ship to the client:

```tsx
import { SearchIcon } from "@kamod-ch/icons/shadcn";
```

## Forms + validation

```tsx
import { FormField, FormAlert, readFormFailure } from "@kamod-ch/otok-kamod/forms";
```

Works with `@kamod-ch/otok-validation` field errors on progressive HTML forms.

## Signals and state (opt-in)

```ts
import { persistedSignal } from "@kamod-ch/otok-kamod/signals";
import { createStore } from "@kamod-ch/otok-kamod/state";
```

These entry points are not bundled until imported.

## Bundle impact

| Piece | When it ships |
|-------|----------------|
| `@kamod-ch/ui/*` subpaths | Only imported components |
| `@kamod-ch/icons/*` | Only imported icons |
| `@kamod-ch/otok-kamod` plugin | Build tooling only |
| Signals / state entry points | When you import them |

## Version errors

At build time the plugin checks installed Kamod package versions and prints upgrade instructions when ranges are incompatible.

## Starters

```bash
pnpm create otok my-ui --template kamod
pnpm create otok my-saas --template saas
pnpm create otok my-app --template dashboard
```

## See also

- [CLI — otok add](./cli-add.md)
- [Validation](./validation.md)
- [Auth, CRUD, Styling](./auth-crud-styling.md)
