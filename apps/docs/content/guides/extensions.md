---
title: Composition Packages
section: Guides
order: 33
---
# Composition Packages

Optional packages around Otok core. They are **composition**, not a plugin system. Core stays free of auth, validation, database, billing, and OAuth dependencies.

| Package | Purpose |
|---------|---------|
| [`@kamod-ch/otok-auth`](https://github.com/kamod-ch/otok/tree/main/packages/otok-auth) | Cookie sessions, CSRF, password hashing, route/API middleware, memory/Kysely session adapters |
| [`@kamod-ch/otok-validate`](https://github.com/kamod-ch/otok/tree/main/packages/otok-validate) | Zod → `validationError()` for actions and JSON APIs |
| [`@kamod-ch/otok-flash`](https://github.com/kamod-ch/otok/tree/main/packages/otok-flash) | Signed one-time flash cookies for PRG redirects and SSR toasts |
| [`@kamod-ch/otok-stripe`](https://github.com/kamod-ch/otok/tree/main/packages/otok-stripe) | Checkout, Customer Portal, webhooks, `BillingAdapter` |
| [`@kamod-ch/otok-oauth`](https://github.com/kamod-ch/otok/tree/main/packages/otok-oauth) | GitHub/Google OAuth login with signed state/PKCE cookies and `OAuthAdapter` |

See also [`docs/extension-roadmap.md`](https://github.com/kamod-ch/otok/blob/main/docs/extension-roadmap.md) in the repository.

## Typical wiring

1. Persist users/sessions in your app (or use `otok-auth` adapters).
2. Validate forms with `otok-validate`.
3. Mount OAuth/Stripe handlers in `createOtokApp({ configure })`.
4. Show one-shot messages after redirects with `otok-flash`.

Apps keep schema and business rules. Packages provide protocol helpers and middleware only.
