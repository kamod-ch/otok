---
title: Ecosystem catalog
section: Guides
order: 5
---

# Ecosystem catalog

Complete inventory of every published Otok package. Versions are read from package manifests when this page is generated.

> Regenerate with `pnpm docs:ecosystem:generate`. Source: [`docs/ecosystem-catalog.json`](https://github.com/kamod-ch/otok/blob/main/docs/ecosystem-catalog.json).

## Taxonomy

| Kind | Meaning |
| --- | --- |
| **Core** | Framework runtime and Vite integration. |
| **Adapter** | Deployment target wired in `otok.config.ts`. |
| **Plugin** | Registers through `otok.config.ts` / plugin hooks (`integration` includes `plugin`). |
| **Composition** | Imported and wired explicitly by the application. |
| **Kit** | Composable business/application layer. |
| **Preset** | Scaffold-time selection via `create otok --variant`. |
| **Tooling / testing** | CLI, registry, scaffolds, and test helpers. |
| **Contract / fixture** | Extension-author or maintainer packages — not app recommendations. |

Curated guides: [Data and platform](./ecosystem-data-and-platform.md) · [Auth and security](./ecosystem-auth-and-security.md) · [Content and product](./ecosystem-content-and-product.md) · [AI and operations](./ecosystem-ai-and-operations.md) · [Kits and presets](./ecosystem-kits-and-presets.md) · [Adapters](./ecosystem-adapters.md).

## How to add capabilities

1. **Presets** — `pnpm create otok@latest my-app --variant <name>` (see [Kits and presets](./ecosystem-kits-and-presets.md)).
2. **Registry plugins** — `pnpm otok add <alias>` for official extensions in the registry (see [CLI — otok add](./cli-add.md)).
3. **Composition packages** — `pnpm add <package>` and wire imports in server routes, loaders, or `configure`.
4. **Adapters** — install an adapter package and set `adapter` in `otok.config.ts` (see [Deployment adapters](./adapters.md)).

Not every package is a plugin. Check the **Integration** column below.

## Core

Framework runtime, config resolution, and the Vite plugin.

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/otok` | 1.0.0 | `core` | application | included in scaffold | Hono + Preact Islands framework runtime. | [Overview](../index.md) |
| `@kamod-ch/otok-vite-plugin` | 1.0.0 | `core` | application | — | Vite plugin for Otok file routes and Preact islands. | [README](https://github.com/kamod-ch/otok/tree/main/packages/vite-plugin-otok/README.md) |
| `@kamod-ch/otok-config` | 1.0.0 | `core`, `plugin` | **extension-author** | — | Typed plugin API and config resolution for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-config/README.md) |

## Adapter

Deployment targets configured in `otok.config.ts`. See [Ecosystem — adapters](./ecosystem-adapters.md).

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `otok-adapter-cloudflare` | 1.0.0 | `adapter` | application | `pnpm add otok-adapter-cloudflare` | Cloudflare Workers deployment adapter for Otok with worker-safe bundles and Workers Assets. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-cloudflare/README.md) |
| `otok-adapter-node` | 1.0.0 | `adapter` | application | `pnpm add otok-adapter-node` | Node.js deployment adapter for Otok with standalone server builds, static assets, and graceful shutdown. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-node/README.md) |
| `otok-adapter-static` | 1.0.0 | `adapter` | application | `pnpm add otok-adapter-static` | Static hosting adapter for Otok that prerenders known routes for generic static deploys. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-static/README.md) |

## Extension

Optional capabilities — register as plugins, import explicitly, or both.

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/otok-ai` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add ai` | Framework-wide AI integration for Otok — streaming, tools, agents, RAG, budgets, MCP. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-ai/README.md) |
| `@kamod-ch/otok-auth` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add auth` | Cookie sessions, CSRF, and route middleware helpers for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-auth/README.md) |
| `@kamod-ch/otok-kamod` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add kamod` | Optional Kamod UI integration for Otok — Tailwind, themes, forms, and ecosystem helpers. | [kamod](./kamod.md) |
| `@kamod-ch/otok-kysely` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add kysely` | Kysely database integration for Otok — typed db context, migrations, seeds, and CLI. | [kysely](./kysely.md) |
| `@kamod-ch/otok-supabase` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add supabase` | Supabase SSR, cookie auth, and middleware integration for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-supabase/README.md) |
| `@kamod-ch/otok-audit` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add audit` | Immutable audit trail for Otok — actor, action, resource, changes, multi-tenant search and export. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-audit/README.md) |
| `@kamod-ch/otok-content` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add content` | Typed content collections for Otok — markdown, MDX, taxonomies, and build-time manifests. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-content/README.md) |
| `@kamod-ch/otok-devtools` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add devtools` | Development-only diagnostics and inspector UI for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-devtools/README.md) |
| `@kamod-ch/otok-discussions` | 0.1.0 | `composition`, `plugin` | application | `pnpm otok add discussions` | Subject-scoped discussions for Otok — headless domain core, adapters, optional Kamod UI, and plugin routes. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-discussions/README.md) |
| `@kamod-ch/otok-events` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add events` | Typed domain events for Otok — in-process bus, transactional outbox, and Kysely integration. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-events/README.md) |
| `@kamod-ch/otok-flash` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add flash` | Signed flash cookies for Otok PRG redirects and SSR toasts. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-flash/README.md) |
| `@kamod-ch/otok-forum` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add forum` | Production-ready optional forum extension for Otok — SSR, Kysely, permissions, moderation. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-forum/README.md) |
| `@kamod-ch/otok-i18n` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add i18n` | Locale resolution, message catalogs, and i18n helpers for Otok apps. | [i18n](./i18n.md) |
| `@kamod-ch/otok-mail` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add mail` | Provider-based mail integration for Otok — SMTP, Resend, Mailpit, and test providers. | [otok-mail](./otok-mail.md) |
| `@kamod-ch/otok-oauth` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add oauth` | OAuth login helpers (GitHub, Google, Microsoft, GitLab) for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-oauth/README.md) |
| `@kamod-ch/otok-observability` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add observability` | Structured logging, tracing, and error reporting for Otok apps. | [seo-security-observability](./seo-security-observability.md) |
| `@kamod-ch/otok-queue` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add queue` | Provider-based job queue for Otok — typed jobs, retry, idempotency, cron, and in-memory dev provider. | [otok-queue](./otok-queue.md) |
| `@kamod-ch/otok-realtime` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add realtime` | Typed SSE and WebSocket realtime for Otok — channels, rooms, presence, and scalable providers. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-realtime/README.md) |
| `@kamod-ch/otok-search` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add search` | Lightweight full-text search index for Otok apps — CRM company indexing. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-search/README.md) |
| `@kamod-ch/otok-security` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add security` | Secure defaults and configurable security middleware for Otok apps. | [seo-security-observability](./seo-security-observability.md) |
| `@kamod-ch/otok-seo` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add seo` | Typed route metadata, sitemaps, feeds, and SEO helpers for Otok apps. | [seo-security-observability](./seo-security-observability.md) |
| `@kamod-ch/otok-storage` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add storage` | Provider-based object storage for Otok — local filesystem, S3, R2, and MinIO. | [otok-storage](./otok-storage.md) |
| `@kamod-ch/otok-stripe` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add stripe` | Stripe Checkout and webhook helpers for Otok apps. | [otok-stripe-plugin](./otok-stripe-plugin.md) |
| `@kamod-ch/otok-validation` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add validation` | Standard Schema validation for Otok — typed inputs, field errors, and defineAction integration. | [validation](./validation.md) |
| `@kamod-ch/otok-workflows` | 1.0.0 | `composition`, `plugin` | application | `pnpm otok add workflows` | Durable multi-step workflows for Otok — typed steps, retries, cron, and persistent providers. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-workflows/README.md) |
| `@kamod-ch/otok-plugin-hello` | 1.0.0 | `composition`, `plugin` | **extension-author** | `pnpm add @kamod-ch/otok-plugin-hello` | Minimal Otok plugin example that registers a health-style API route. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-hello/README.md) |

## Kit

Composable business layers merged at scaffold or runtime. See [Kits and presets](./ecosystem-kits-and-presets.md).

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/otok-kit-admin` | 1.0.0 | `composition` | application | scaffold / `mergeKits` | Admin shell kit — users, roles, org settings. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-admin/README.md) |
| `@kamod-ch/otok-kit-content` | 1.0.0 | `composition` | application | scaffold / `mergeKits` | Otok package @kamod-ch/otok-kit-content | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-content/README.md) |
| `@kamod-ch/otok-kit-crm` | 1.0.0 | `composition` | application | scaffold / `mergeKits` | Composable Swiss B2B CRM kit for Otok — organizations, companies, contacts, pipelines, audit, search, import/export. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-crm/README.md) |
| `@kamod-ch/otok-kit-marketplace` | 1.0.0 | `composition` | application | scaffold / `mergeKits` | Otok package @kamod-ch/otok-kit-marketplace | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-marketplace/README.md) |
| `@kamod-ch/otok-kit-saas` | 1.0.0 | `composition` | application | scaffold / `mergeKits` | Billing kit — Stripe checkout, portal, webhooks, and subscriptions. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-saas/README.md) |

## Preset

Scaffold-time bundles selected with `create otok --variant`. See [Kits and presets](./ecosystem-kits-and-presets.md).

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/otok-preset-crm` | 1.0.0 | `scaffold` | application | `pnpm create otok@latest my-app --variant crm` | Official Otok crm preset. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-crm/README.md) |
| `@kamod-ch/otok-preset-dashboard` | 1.0.0 | `scaffold` | application | `pnpm create otok@latest my-app --variant dashboard` | Official Otok dashboard preset. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-dashboard/README.md) |
| `@kamod-ch/otok-preset-kamod` | 1.0.0 | `scaffold` | application | `pnpm create otok@latest my-app --variant kamod` | Official Otok kamod preset. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-kamod/README.md) |
| `@kamod-ch/otok-preset-minimal` | 1.0.0 | `scaffold` | application | `pnpm create otok@latest my-app --variant minimal` | Official Otok minimal preset. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-minimal/README.md) |
| `@kamod-ch/otok-preset-saas` | 1.0.0 | `scaffold` | application | `pnpm create otok@latest my-app --variant saas` | Official Otok saas preset. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-saas/README.md) |

## Tooling

CLI, registry, scaffolds, and test helpers for authors and maintainers.

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `create-otok` | 1.0.0 | `cli`, `scaffold` | application | `pnpm create otok@latest my-app` | Scaffold a new Otok app with presets, layers, and reproducible versions. | [README](https://github.com/kamod-ch/otok/tree/main/packages/create-otok/docs/cli.md) |
| `otok-cli` | 1.0.0 | `cli` | application | — | CLI for Otok apps — add plugins, manage configuration. | [cli-add](./cli-add.md) |
| `@kamod-ch/otok-registry` | 1.0.0 | `cli`, `composition` | **extension-author** | `pnpm add @kamod-ch/otok-registry` | Versioned extension registry for Otok — schema, cache, search, and compatibility checks. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-registry/README.md) |
| `@kamod-ch/otok-route-typegen` | 1.0.0 | `core` | **extension-author** | — | Route tree parsing, conflict detection, and TypeScript type generation for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-route-typegen/README.md) |
| `@kamod-ch/otok-test` | 1.0.0 | `testing` | **extension-author** | — | Official server-side and client testing utilities for Otok apps. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-test/README.md) |

## Migration

Compatibility shims for migrating existing apps.

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/preactpress-compat` | 1.0.0 | `composition` | application | `pnpm add @kamod-ch/preactpress-compat` | Compatibility layer for migrating PreactPress sites to Otok and @kamod-ch/otok-content. | [README](https://github.com/kamod-ch/otok/tree/main/packages/preactpress-compat/README.md) |

## Contract

Contributor-facing contracts and fixtures — not recommended application dependencies.

*Contributor-only — do not add these as casual application dependencies.*

| Package | Version | Integration | Audience | Install | Summary | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| `@kamod-ch/otok-plugin-contract` | 1.0.0 | `plugin` | **extension-author** | — (contributor) | Shared contract tests for Otok plugins — validates definePlugin hooks and lifecycle. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-contract/README.md) |
| `@kamod-ch/otok-plugin-fixture` | 1.0.0 | `plugin` | **maintainer** | — (contributor) | Otok plugin fixture used by tests to exercise multiple plugin hooks. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-fixture/README.md) |
| `otok-adapter-contract` | 1.0.0 | `adapter` | **maintainer** | — (contributor) | Shared contract tests and fixtures for Otok deployment adapters. | [README](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-contract/README.md) |

