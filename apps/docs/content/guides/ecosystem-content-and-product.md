---
title: Ecosystem — content and product
section: Guides
order: 8
---

# Content and product packages

Marketing content, locales, SEO, email, billing, and community features.

Full list: [ecosystem catalog](./ecosystem.md).

## Packages

| Package                      | When to use                  | Integration          | Deep dive                                                                              |
| ---------------------------- | ---------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `@kamod-ch/otok-content`     | Markdown/MDX collections     | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-content)     |
| `@kamod-ch/otok-i18n`        | Locales and translations     | plugin + composition | [i18n guide](./i18n.md)                                                                |
| `@kamod-ch/otok-seo`         | Metadata and sitemap helpers | plugin               | [SEO, security, observability](./seo-security-observability.md)                        |
| `@kamod-ch/otok-mail`        | Transactional email          | plugin               | [Mail guide](./otok-mail.md)                                                           |
| `@kamod-ch/otok-stripe`      | Stripe checkout and portal   | plugin               | [Stripe plugin guide](./otok-stripe-plugin.md)                                         |
| `@kamod-ch/otok-discussions` | Threaded discussions         | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-discussions) |
| `@kamod-ch/otok-forum`       | Forum-style boards           | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-forum)       |
| `@kamod-ch/otok-kamod`       | Kamod UI + forms             | plugin + composition | [Kamod guide](./kamod.md)                                                              |

## Server vs client

Content and SEO run on the server. Stripe webhooks and mail providers must stay in server routes or plugin `configureApp` hooks — do not import secrets in client islands.

## Examples

- [`examples/saas-reference`](https://github.com/kamod-ch/otok/tree/main/examples/saas-reference)
- [`examples/discussions-reference`](https://github.com/kamod-ch/otok/tree/main/examples/discussions-reference)
