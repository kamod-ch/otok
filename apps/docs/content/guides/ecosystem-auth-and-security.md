---
title: Ecosystem — auth and security
section: Guides
order: 7
---

# Auth and security packages

Sessions, OAuth, validation, flash messages, security headers, and audit trails. Wire through plugins where available, or import middleware and helpers directly.

Catalog: [ecosystem.md](./ecosystem.md).

## Packages

| Package                     | When to use                             | Integration          | Deep dive                                                                        |
| --------------------------- | --------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `@kamod-ch/otok-auth`       | Cookie sessions, CSRF, route middleware | plugin + composition | [Auth CRUD styling](./auth-crud-styling.md)                                      |
| `@kamod-ch/otok-oauth`      | GitHub/Google OAuth                     | plugin               | [CLI — otok add](./cli-add.md)                                                   |
| `@kamod-ch/otok-validation` | Standard Schema actions and forms       | plugin + composition | [Validation guide](./validation.md)                                              |
| `@kamod-ch/otok-flash`      | Signed flash cookies after redirects    | plugin + composition | [Composition guide](./extensions.md)                                             |
| `@kamod-ch/otok-security`   | Security headers and helpers            | plugin               | [SEO, security, observability](./seo-security-observability.md)                  |
| `@kamod-ch/otok-audit`      | Immutable audit log                     | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-audit) |

## Plugin vs composition

- **`pnpm otok add oauth`** — registers plugin hooks in `otok.config.ts`.
- **Direct import** — use `createOtokApp({ configure })` to mount handlers and middleware without a plugin entry.

## Security notes

Keep session secrets and OAuth client secrets server-side. Configure redirect allowlists for OAuth callbacks.

## Examples

- [`examples/auth-github`](https://github.com/kamod-ch/otok/tree/main/examples/auth-github)
- [`examples/seo-security-observability`](https://github.com/kamod-ch/otok/tree/main/examples/seo-security-observability)
