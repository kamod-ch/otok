---
title: Composition Packages
section: Guides
order: 33
---

# Composition packages

Optional packages around Otok core. Use them by **importing and wiring** server routes, loaders, middleware, and helpers (**composition**), or register a **plugin** when the package exposes `definePlugin` and you want `otok.config.ts` integration.

The core framework stays free of auth, validation, database, billing, and OAuth dependencies.

**Complete inventory:** [Ecosystem catalog](./ecosystem.md) (taxonomy, versions, install commands).

**Curated groups:** [Data and platform](./ecosystem-data-and-platform.md) · [Auth and security](./ecosystem-auth-and-security.md) · [Content and product](./ecosystem-content-and-product.md) · [AI and operations](./ecosystem-ai-and-operations.md).

## Choosing an integration mode

| Mode            | Choose when                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Plugin**      | Package supports `otok add` / `plugins: []` and you want build + runtime hooks.                         |
| **Composition** | You mount handlers, middleware, or helpers manually in `createOtokApp({ configure })` or route modules. |
| **Both**        | Many official packages support either path; pick one consistent approach per app.                       |

## Server-only vs browser-safe

Import server utilities from package `/server` or documented server entry points. Do not import secrets, session stores, or provider clients into island/client bundles.

## Runtime and adapters

Check whether a package needs Node APIs (filesystem, long-lived workers, native drivers). Match your [deployment adapter](./adapters.md) — Cloudflare and static adapters reject unsupported capabilities at config time when plugins call `assertAdapterCapability`.

## Registry and CLI

Official plugins are discoverable through `@kamod-ch/otok-registry`. Use [`pnpm otok add`](./cli-add.md) for registry-backed packages; use `pnpm add <package>` for composition-only wiring.

## Security and configuration

Keep API keys, webhook secrets, and session material in environment variables. Follow security notes on registry entries (OAuth redirect allowlists, storage credentials, AI provider keys).

## Example wiring (composition)

Typical stack wired explicitly:

1. Persist users/sessions with `@kamod-ch/otok-auth` adapters.
2. Validate forms with `@kamod-ch/otok-validation`.
3. Mount OAuth/Stripe handlers in `createOtokApp({ configure })`.
4. Show one-shot messages after redirects with `@kamod-ch/otok-flash`.

Dedicated guides cover common packages: [validation](./validation.md), [mail](./otok-mail.md), [storage](./otok-storage.md), [queue](./otok-queue.md), [Stripe](./otok-stripe-plugin.md), [i18n](./i18n.md), [Kysely](./kysely.md).

## Plugins

For hook lifecycle and authoring, see [Plugins](./plugins.md).

Repository design notes: [`docs/adr/0006-plugin-system.md`](https://github.com/kamod-ch/otok/blob/main/docs/adr/0006-plugin-system.md).
