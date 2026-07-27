# @kamod-ch/otok-i18n

Full i18n integration for [Otok](https://github.com/kamod-ch/otok): routing, SSR, islands, metadata, and the plugin API.

## Install

```bash
pnpm add @kamod-ch/otok-i18n hono otok
pnpm add preact   # for islands / client hooks
```

## Quick start (plugin API)

```ts
// otok.config.ts
import { defineConfig } from "otok";
import i18n from "@kamod-ch/otok-i18n";

export default defineConfig({
  plugins: [
    i18n({
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      routing: "prefix-except-default",
      fallbackLocale: "en",
      messages: {
        de: () => import("./locales/de.json"),
        en: () => import("./locales/en.json"),
        fr: () => import("./locales/fr.json"),
      },
    }),
  ],
});
```

The plugin registers app-level middleware automatically (`configureApp`). No manual `_middleware.ts` required unless you need custom ordering.

## Routing modes

| Mode | Example URLs |
|------|----------------|
| `prefix` | `/de/products`, `/en/products` |
| `prefix-except-default` | `/products` (de), `/en/products` |
| `domain` | `example.ch`, `example.fr` (via `domains` map) |
| `none` | No locale in URL — cookie / `Accept-Language` only |

## Locale resolution priority

1. **URL** — path prefix or domain (depending on `routing`)
2. **Cookie** — `locale` (configurable via `cookieName`)
3. **`Accept-Language`**
4. **`defaultLocale`**

Unknown locale prefixes (e.g. `/xx/about`) redirect once to the canonical path when `redirectUnknownLocale` is true (default).

## Server: loaders and `t()`

```ts
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { i18nHead } from "@kamod-ch/otok-i18n";

export const loader = defineLoader(({ i18n, hono }) => ({
  title: i18n.t("dashboard.welcome"),
  i18n: serializeI18n(hono), // active locale only — safe for hydration
}));

export const head = ({ data }) =>
  i18nHead({
    locale: data.i18n.locale,
    locales: ["de", "en", "fr"],
    defaultLocale: "de",
    origin: "https://example.com",
    pathname: "/dashboard",
    extra: { title: data.title },
  });
```

## Islands: `useI18n()` / `useTranslation()`

```tsx
import { I18nProvider, useI18n } from "@kamod-ch/otok-i18n/client";

export function Welcome({ itemCount }: { itemCount: number }) {
  const { t, locale, formatCurrency } = useI18n();
  return (
    <>
      <h1>{t("dashboard.welcome")}</h1>
      <p>{t("items", { count: itemCount })}</p>
      <p>{formatCurrency(29, "CHF")}</p>
    </>
  );
}

// In route: pass loader payload
<I18nProvider {...data.i18n}>
  <Welcome itemCount={3} />
</I18nProvider>
```

SSR and hydration use the same `serializeI18n()` payload — only the active locale messages are sent to the client.

## Features

- Lazy message loading per locale (dynamic `import()`)
- Fallback locale for missing keys
- Pluralization via `Intl.PluralRules` (`items.one`, `items.other`, + `{count}`)
- Safe `{variable}` interpolation (HTML-escaped)
- `formatDate`, `formatTime`, `formatNumber`, `formatPercent`, `formatCurrency` via `Intl`
- Dev warnings for missing keys; production-safe fallbacks
- `LocaleSwitcher` component (`@kamod-ch/otok-i18n/switcher`)
- Localized sitemap helpers (`@kamod-ch/otok-i18n/sitemap`)
- RTL direction hint via `useI18n().direction`
- Typed keys: `TranslationKey<typeof messages>`, `FlattenKeys<…>`

## Route helpers

```ts
import { localizePath, switchLocalePath, createLinkHelper } from "@kamod-ch/otok-i18n/routes";

localizePath("/products", "en", { defaultLocale: "de", routing: "prefix-except-default" });
// → "/en/products"

switchLocalePath("/en/products", "fr", ["de", "en", "fr"], { defaultLocale: "de" });
// → "/fr/products"
```

## Legacy flat-catalog API

Still supported for apps without the plugin:

```ts
import { createI18nMiddleware, toRouteMiddleware } from "@kamod-ch/otok-i18n/middleware";

// File-based _middleware.ts — export default:
export default createI18nMiddleware(i18nConfig);

// Programmatic route middleware arrays:
middleware: [toRouteMiddleware(createI18nMiddleware(i18nConfig))];
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-i18n` | Plugin factory + core API |
| `@kamod-ch/otok-i18n/middleware` | Middleware, `readI18n`, `toRouteMiddleware` |
| `@kamod-ch/otok-i18n/loader` | `defineLoader`, `serializeI18n` |
| `@kamod-ch/otok-i18n/client` | `I18nProvider`, `useI18n`, `useTranslation` |
| `@kamod-ch/otok-i18n/routes` | Path / link helpers |
| `@kamod-ch/otok-i18n/sitemap` | Localized sitemap XML |
| `@kamod-ch/otok-i18n/switcher` | `LocaleSwitcher` component |

## Example

See [`examples/i18n-trilingual`](../../examples/i18n-trilingual) for a complete DE / EN / FR app.

## Related packages

| Package | Purpose |
|---------|---------|
| `@kamod-ch/otok-auth` | Sessions, CSRF |
| `@kamod-ch/otok-validate` | Zod validation |
| `@kamod-ch/otok-flash` | Flash messages |
