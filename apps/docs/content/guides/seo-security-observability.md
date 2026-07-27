---
title: SEO, Security & Observability
description: Production plugins for metadata, secure defaults, and request tracing.
---

# SEO, Security & Observability

Otok ships three production plugins for metadata, secure defaults, and observability.

## Install

```bash
otok add security observability seo
```

Or manually:

```bash
pnpm add @kamod-ch/otok-security @kamod-ch/otok-observability @kamod-ch/otok-seo
```

## Recommended plugin order

```ts
export default defineConfig({
  plugins: [
    security({ trustedHosts: ["example.com"] }),
    observability(),
    i18n({ /* ... */ }),
    auth({ /* ... */ }),
    seo({ origin: "https://example.com" }),
  ],
});
```

| Order | Plugin | Why |
|-------|--------|-----|
| 1 | `security` | CSP, CSRF, body limits, host validation before any handler |
| 2 | `observability` | Request ID and spans wrap downstream plugins and SSR |
| 3 | `i18n` | Locale available for SEO hreflang and loaders |
| 4 | `auth` | Session hydration; may use CSRF from security or auth |
| 5 | `seo` | Utility routes (`/robots.txt`, `/sitemap.xml`) after guards |

## SEO

```ts
import { defineMeta } from "@kamod-ch/otok-seo";

export const head = defineMeta(({ data }) => ({
  title: data.product.name,
  description: data.product.description,
  canonical: `/products/${data.product.slug}`,
  openGraph: { type: "product" },
}));
```

With i18n, use `seoI18nHead` for hreflang and localized canonical URLs.

## Security

Secure defaults are on in production. Disabling CSP or CSRF throws unless `strict: false`.

Use `@kamod-ch/otok-auth/csrf` instead of the built-in CSRF by setting `csrf: false` (non-production only).

## Observability

Wrap loaders and actions with traced helpers:

```ts
import { defineLoader } from "@kamod-ch/otok-observability/loader";
```

Logs redact cookies, tokens, passwords, and form secrets automatically.

## Example

See [`examples/seo-security-observability`](https://github.com/kamod-ch/otok/tree/main/examples/seo-security-observability).
