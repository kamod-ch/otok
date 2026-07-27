# Otok i18n example (DE / EN / FR)

Trilingual demo for `@kamod-ch/otok-i18n` with plugin-based setup, lazy locale bundles, islands, hreflang metadata, and a localized sitemap.

## Features demonstrated

- `i18n()` plugin in `otok.config.ts`
- Routing mode `prefix-except-default` (`/`, `/en/…`, `/fr/…`)
- Server `defineLoader` + client `useI18n()` with matching SSR payload
- Pluralization, interpolation, and `formatCurrency`
- `LocaleSwitcher` preserving the current path
- Canonical URL + `hreflang` via `i18nHead`
- Localized sitemap at `/sitemap.xml`

## Run locally

This example lives outside the Otok workspace. Copy it or link packages, then:

```bash
pnpm install
pnpm dev
```

Visit:

- http://localhost:5173/ — German (default)
- http://localhost:5173/en/ — English
- http://localhost:5173/fr/products — French products

## Config

```ts
import i18n from "@kamod-ch/otok-i18n";

export default defineConfig({
  plugins: [
    i18n({
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      routing: "prefix-except-default",
      fallbackLocale: "en",
      messages: {
        de: () => import("./src/locales/de.json"),
        en: () => import("./src/locales/en.json"),
        fr: () => import("./src/locales/fr.json"),
      },
    }),
  ],
});
```

Only the active locale JSON is loaded per request — other locales stay out of the client bundle until switched.
