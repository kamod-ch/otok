# @kamod-ch/otok-i18n

Locale resolution, message catalogs, and i18n helpers for [Otok](https://github.com/kamod-ch/otok).

Composition package — Otok core stays free of i18n. Pair with optional `[[lang]]` route segments.

## Install

```bash
pnpm add @kamod-ch/otok-i18n hono otok
# optional, for islands:
pnpm add preact
```

## App config

```ts
// src/features/i18n.ts
import type { I18nConfig } from "@kamod-ch/otok-i18n";

export const catalog = {
  en: { "about.title": "About", "nav.home": "Home" },
  de: { "about.title": "Über uns", "nav.home": "Start" },
} as const;

export const i18nConfig = {
  catalog,
  locales: ["en", "de"],
  defaultLocale: "en",
} satisfies I18nConfig<typeof catalog>;
```

## Middleware

```ts
// src/app/routes/[[lang]]/_middleware.ts
import { createI18nMiddleware } from "@kamod-ch/otok-i18n/middleware";
import { i18nConfig } from "../../features/i18n.js";

export default createI18nMiddleware(i18nConfig);
```

Resolution order: URL locale segment → cookie → `Accept-Language` → `defaultLocale`.

No automatic redirect — apps choose canonical URL policy.

## Loader + head

```ts
import { readI18n } from "@kamod-ch/otok-i18n/middleware";
import { i18nHead } from "@kamod-ch/otok-i18n";
import type { OtokContext } from "otok/server";

export const loader = ({ hono }: OtokContext) => {
  const i18n = readI18n(hono)!;
  return { locale: i18n.locale, title: i18n.t("about.title") };
};

export const head = ({ data }) => i18nHead(data.locale, { title: data.title });
```

Or call `createI18n` directly in a loader with `params.lang`:

```ts
import { createI18n } from "@kamod-ch/otok-i18n";
import { i18nConfig } from "../../features/i18n.js";

export const loader = ({ params, request }: OtokContext) => {
  const i18n = createI18n(i18nConfig, {
    param: params.lang,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
  });
  return { locale: i18n.locale, title: i18n.t("about.title") };
};
```

## Client / islands

```tsx
import { I18nProvider, useT } from "@kamod-ch/otok-i18n/client";

function Greeting() {
  const t = useT();
  return <p>{t("nav.home")}</p>;
}

// Pass serializable locale + catalog from the loader:
<I18nProvider locale={data.locale} defaultLocale="en" catalog={catalog}>
  <Greeting />
</I18nProvider>
```

## Route helpers

```ts
import { localizePath, withLocaleParam } from "@kamod-ch/otok-i18n/routes";
import { route } from "virtual:otok-routes";

localizePath("/about", "de"); // "/de/about"
localizePath("/about", "en", { defaultLocale: "en" }); // "/about"

route("/[[lang]]/about", {
  params: withLocaleParam({}, "de"),
});
```

## API

| Export | Purpose |
|--------|---------|
| `resolveLocale` / `matchLocale` / `parseAcceptLanguage` | Locale resolution |
| `createTranslator` | `t(key, fallback?)` from a catalog |
| `createI18n` | Resolve locale + build translator |
| `createI18nMiddleware` / `readI18n` | Hono context for routes |
| `i18nHead` | Set `head.lang` for `<html lang>` |
| `localizePath` / `stripLocaleParam` / `withLocaleParam` | URL helpers |
| `I18nProvider` / `useT` / `useLocale` | Client islands |

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-i18n` | Re-exports (server-safe) |
| `@kamod-ch/otok-i18n/middleware` | Middleware + `readI18n` |
| `@kamod-ch/otok-i18n/routes` | Path / param helpers |
| `@kamod-ch/otok-i18n/client` | Preact provider + hooks |

## Design notes

- Flat string catalogs (`"nav.home"`). No ICU / pluralization in v1.
- Fallback chain: active locale → default locale → explicit fallback → key.
- Does not add i18n to Otok core.

## Related packages

| Package | Purpose |
|---------|---------|
| `@kamod-ch/otok-auth` | Sessions, CSRF, auth middleware |
| `@kamod-ch/otok-validate` | Zod → `validationError()` |
| `@kamod-ch/otok-flash` | Signed flash cookies for PRG |
| `@kamod-ch/otok-stripe` | Checkout, portal, webhooks |
| `@kamod-ch/otok-oauth` | GitHub/Google OAuth login |
