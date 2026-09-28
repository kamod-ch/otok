---
title: Ecosystem — kits and presets
section: Guides
order: 10
---

# Kits and presets

**Presets** select a scaffold variant. **Kits** are composable business layers merged at scaffold time or with `mergeKits`.

Complete inventory: [ecosystem catalog](./ecosystem.md). Repository overview: [business kits](https://github.com/kamod-ch/otok/blob/main/docs/business-kits.md).

## Presets (`create otok --variant`)

| Variant     | Preset package                    | Typical use                  |
| ----------- | --------------------------------- | ---------------------------- |
| `minimal`   | `@kamod-ch/otok-preset-minimal`   | Counter demo, no UI library  |
| `content`   | (content starter)                 | Marketing / blog             |
| `kamod`     | `@kamod-ch/otok-preset-kamod`     | Kamod UI + Tailwind          |
| `dashboard` | `@kamod-ch/otok-preset-dashboard` | Admin-style dashboard        |
| `saas`      | `@kamod-ch/otok-preset-saas`      | Auth, i18n, data, validation |
| `crm`       | `@kamod-ch/otok-preset-crm`       | CRM demo with mutations      |
| `api`       | API starter                       | JSON API + docs UI           |

```bash
pnpm create otok@latest my-app --variant saas
```

Preset packages are for `create-otok` — you normally do not `pnpm add` them to an existing app.

## Kits

| Kit          | Package                          |
| ------------ | -------------------------------- |
| CRM          | `@kamod-ch/otok-kit-crm`         |
| SaaS billing | `@kamod-ch/otok-kit-saas`        |
| Admin        | `@kamod-ch/otok-kit-admin`       |
| Marketplace  | `@kamod-ch/otok-kit-marketplace` |
| Content CMS  | `@kamod-ch/otok-kit-content`     |

Kits copy routes and migrations into your app. Override files with `kitOverrides` instead of ejecting.

## Maturity

Kits are reference implementations. Review auth, billing, and data models before production deployment.

## Examples

- [`examples/kit-crm-swiss`](https://github.com/kamod-ch/otok/tree/main/examples/kit-crm-swiss)
- [`examples/saas-reference`](https://github.com/kamod-ch/otok/tree/main/examples/saas-reference)
