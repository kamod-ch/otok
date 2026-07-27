# @kamod-ch/otok-kamod

Optional [Kamod](https://github.com/kamod-ch) integration for [Otok](https://github.com/kamod-ch/otok). Kamod is **not** part of Otok core — install this plugin when you want Kamod UI, Tailwind v4, themes, and form helpers.

## Install

```bash
pnpm otok add kamod
```

Or manually:

```bash
pnpm add @kamod-ch/otok-kamod @kamod-ch/ui @preact/signals preact
pnpm add -D tailwindcss @tailwindcss/vite
```

## Configure

```ts
import { defineConfig } from "otok";
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

The plugin:

- registers `@tailwindcss/vite` (remove duplicate `tailwindcss()` from `vite.config.ts` when using `kamod()`)
- sets Otok `theme: true` for SSR dark-mode bootstrap
- wires `devStylesheets` to your CSS entry (`src/style.css` by default)
- validates Kamod package versions at build time with actionable errors

## CSS

After `otok add kamod`, import the generated stylesheet or merge into `src/style.css`:

```css
@import "tailwindcss";
@import "@kamod-ch/ui/theme.css";
```

For brand presets (`theme: "kamod"`, `"ocean"`, …):

```bash
pnpm add @kamod-ch/themes
```

```css
@import "tailwindcss";
@import "@kamod-ch/themes/theme.css";
@import "@kamod-ch/themes/brands/kamod.css";
```

## Icons (tree-shaken)

Import icons by subpath — only used icons land in the client bundle:

```tsx
import { SearchIcon } from "@kamod-ch/icons/shadcn";
```

## Forms + validation

Connect Otok validation field errors to Kamod UI:

```tsx
import { FormField, FormAlert, FormActions, readFormFailure } from "@kamod-ch/otok-kamod/forms";

export default function NewItem({ actionData }: OtokPageProps) {
  const failure = readFormFailure(actionData);
  return (
    <form method="post" class="grid max-w-md gap-4">
      <FormAlert message={failure?.message} />
      <FormField name="title" label="Title" defaultValue={failure?.values?.title} errors={failure?.fieldErrors?.title} />
      <FormActions cancelHref="/items" />
    </form>
  );
}
```

Requires `@kamod-ch/otok-validation` in your app (optional peer).

## Signals & state (opt-in)

Optional peers are not pulled into the client bundle until you import them:

```ts
import { persistedSignal } from "@kamod-ch/otok-kamod/signals";
// When published: import { createStore } from "@kamod-ch/state";
```

Or import directly from `@kamod-ch/signals` / `@kamod-ch/state`.

## Theme customization

| `theme` option | CSS |
|----------------|-----|
| `"default"` | `@kamod-ch/ui/theme.css` |
| brand preset | `@kamod-ch/themes` + `brands/{preset}.css` |

Use `KamodThemeHead` from `@kamod-ch/otok-kamod/theme` in layouts when brand presets need a no-flash bootstrap script.

## Bundle impact

| Import | Client impact |
|--------|----------------|
| `@kamod-ch/ui/button` (subpath) | Only that component |
| `@kamod-ch/icons/shadcn` | Only imported icons |
| `@kamod-ch/otok-kamod/signals` | Signals runtime when used |
| `@kamod-ch/otok-kamod` plugin | Build-time only (Tailwind Vite plugin) |

## Separation from Otok core

- Otok core has zero Kamod dependencies.
- Removing Kamod: delete `kamod()` from `otok.config.ts`, uninstall `@kamod-ch/otok-kamod` and UI packages, restore your CSS stack.
- Other `@kamod-ch/otok-*` plugins (auth, kysely, validation) work with or without `otok-kamod`.

## Starters

```bash
pnpm create otok my-app --template kamod
pnpm create otok my-saas --template saas
```

See `packages/create-otok/otok-starter-*` in the monorepo.
