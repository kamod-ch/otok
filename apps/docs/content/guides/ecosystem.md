---
title: Ecosystem catalog
section: Guides
order: 5
---

# Ecosystem catalog

Machine-generated inventory of every published Otok package. Versions come from package manifests at generation time.

> Regenerate with `pnpm docs:ecosystem:generate`. Source: [`docs/ecosystem-catalog.json`](../../../docs/ecosystem-catalog.json).

## Core

| Package                      | Version | Integration      | Audience         | Summary                                               | Docs                                                                                           |
| ---------------------------- | ------- | ---------------- | ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@kamod-ch/otok`             | 1.0.0   | `core`           | application      | Hono + Preact Islands framework runtime.              | [Overview](../index.md)                                                                        |
| `@kamod-ch/otok-vite-plugin` | 1.0.0   | `core`           | application      | Vite plugin for Otok file routes and Preact islands.  | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/vite-plugin-otok/README.md) |
| `@kamod-ch/otok-config`      | 1.0.0   | `core`, `plugin` | extension-author | Typed plugin API and config resolution for Otok apps. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-config/README.md)      |

## Adapter

| Package                   | Version | Integration | Audience    | Summary                                                                                                  | Docs                                                                                                  |
| ------------------------- | ------- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `otok-adapter-cloudflare` | 1.0.0   | `adapter`   | application | Cloudflare Workers deployment adapter for Otok with worker-safe bundles and Workers Assets.              | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-cloudflare/README.md) |
| `otok-adapter-node`       | 1.0.0   | `adapter`   | application | Node.js deployment adapter for Otok with standalone server builds, static assets, and graceful shutdown. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-node/README.md)       |
| `otok-adapter-static`     | 1.0.0   | `adapter`   | application | Static hosting adapter for Otok that prerenders known routes for generic static deploys.                 | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-static/README.md)     |

## Extension

| Package                        | Version | Integration             | Audience         | Summary                                                                                                     | Docs                                                                                            |
| ------------------------------ | ------- | ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `@kamod-ch/otok-ai`            | 1.0.0   | `composition`, `plugin` | application      | Framework-wide AI integration for Otok — streaming, tools, agents, RAG, budgets, MCP.                       | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-ai/README.md)           |
| `@kamod-ch/otok-auth`          | 1.0.0   | `composition`, `plugin` | application      | Cookie sessions, CSRF, and route middleware helpers for Otok apps.                                          | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-auth/README.md)         |
| `@kamod-ch/otok-kamod`         | 1.0.0   | `composition`, `plugin` | application      | Optional Kamod UI integration for Otok — Tailwind, themes, forms, and ecosystem helpers.                    | [kamod](./kamod.md)                                                                             |
| `@kamod-ch/otok-kysely`        | 1.0.0   | `composition`, `plugin` | application      | Kysely database integration for Otok — typed db context, migrations, seeds, and CLI.                        | [kysely](./kysely.md)                                                                           |
| `@kamod-ch/otok-supabase`      | 1.0.0   | `composition`, `plugin` | application      | Supabase SSR, cookie auth, and middleware integration for Otok apps.                                        | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-supabase/README.md)     |
| `@kamod-ch/otok-audit`         | 1.0.0   | `composition`, `plugin` | application      | Immutable audit trail for Otok — actor, action, resource, changes, multi-tenant search and export.          | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-audit/README.md)        |
| `@kamod-ch/otok-content`       | 1.0.0   | `composition`, `plugin` | application      | Typed content collections for Otok — markdown, MDX, taxonomies, and build-time manifests.                   | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-content/README.md)      |
| `@kamod-ch/otok-devtools`      | 1.0.0   | `composition`, `plugin` | application      | Development-only diagnostics and inspector UI for Otok apps.                                                | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-devtools/README.md)     |
| `@kamod-ch/otok-discussions`   | 0.1.0   | `composition`, `plugin` | application      | Subject-scoped discussions for Otok — headless domain core, adapters, optional Kamod UI, and plugin routes. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-discussions/README.md)  |
| `@kamod-ch/otok-events`        | 1.0.0   | `composition`, `plugin` | application      | Typed domain events for Otok — in-process bus, transactional outbox, and Kysely integration.                | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-events/README.md)       |
| `@kamod-ch/otok-flash`         | 1.0.0   | `composition`, `plugin` | application      | Signed flash cookies for Otok PRG redirects and SSR toasts.                                                 | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-flash/README.md)        |
| `@kamod-ch/otok-forum`         | 1.0.0   | `composition`, `plugin` | application      | Production-ready optional forum extension for Otok — SSR, Kysely, permissions, moderation.                  | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-forum/README.md)        |
| `@kamod-ch/otok-i18n`          | 1.0.0   | `composition`, `plugin` | application      | Locale resolution, message catalogs, and i18n helpers for Otok apps.                                        | [i18n](./i18n.md)                                                                               |
| `@kamod-ch/otok-mail`          | 1.0.0   | `composition`, `plugin` | application      | Provider-based mail integration for Otok — SMTP, Resend, Mailpit, and test providers.                       | [otok-mail](./otok-mail.md)                                                                     |
| `@kamod-ch/otok-oauth`         | 1.0.0   | `composition`, `plugin` | application      | OAuth login helpers (GitHub, Google, Microsoft, GitLab) for Otok apps.                                      | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-oauth/README.md)        |
| `@kamod-ch/otok-observability` | 1.0.0   | `composition`, `plugin` | application      | Structured logging, tracing, and error reporting for Otok apps.                                             | [seo-security-observability](./seo-security-observability.md)                                   |
| `@kamod-ch/otok-plugin-hello`  | 1.0.0   | `composition`, `plugin` | extension-author | Minimal Otok plugin example that registers a health-style API route.                                        | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-hello/README.md) |
| `@kamod-ch/otok-queue`         | 1.0.0   | `composition`, `plugin` | application      | Provider-based job queue for Otok — typed jobs, retry, idempotency, cron, and in-memory dev provider.       | [otok-queue](./otok-queue.md)                                                                   |
| `@kamod-ch/otok-realtime`      | 1.0.0   | `composition`, `plugin` | application      | Typed SSE and WebSocket realtime for Otok — channels, rooms, presence, and scalable providers.              | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-realtime/README.md)     |
| `@kamod-ch/otok-search`        | 1.0.0   | `composition`, `plugin` | application      | Lightweight full-text search index for Otok apps — CRM company indexing.                                    | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-search/README.md)       |
| `@kamod-ch/otok-security`      | 1.0.0   | `composition`, `plugin` | application      | Secure defaults and configurable security middleware for Otok apps.                                         | [seo-security-observability](./seo-security-observability.md)                                   |
| `@kamod-ch/otok-seo`           | 1.0.0   | `composition`, `plugin` | application      | Typed route metadata, sitemaps, feeds, and SEO helpers for Otok apps.                                       | [seo-security-observability](./seo-security-observability.md)                                   |
| `@kamod-ch/otok-storage`       | 1.0.0   | `composition`, `plugin` | application      | Provider-based object storage for Otok — local filesystem, S3, R2, and MinIO.                               | [otok-storage](./otok-storage.md)                                                               |
| `@kamod-ch/otok-stripe`        | 1.0.0   | `composition`, `plugin` | application      | Stripe Checkout and webhook helpers for Otok apps.                                                          | [otok-stripe-plugin](./otok-stripe-plugin.md)                                                   |
| `@kamod-ch/otok-validation`    | 1.0.0   | `composition`, `plugin` | application      | Standard Schema validation for Otok — typed inputs, field errors, and defineAction integration.             | [validation](./validation.md)                                                                   |
| `@kamod-ch/otok-workflows`     | 1.0.0   | `composition`, `plugin` | application      | Durable multi-step workflows for Otok — typed steps, retries, cron, and persistent providers.               | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-workflows/README.md)    |

## Kit

| Package                          | Version | Integration   | Audience    | Summary                                                                                                              | Docs                                                                                               |
| -------------------------------- | ------- | ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@kamod-ch/otok-kit-admin`       | 1.0.0   | `composition` | application | Admin shell kit — users, roles, org settings.                                                                        | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-admin/README.md)       |
| `@kamod-ch/otok-kit-content`     | 1.0.0   | `composition` | application | Otok package @kamod-ch/otok-kit-content                                                                              | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-content/README.md)     |
| `@kamod-ch/otok-kit-crm`         | 1.0.0   | `composition` | application | Composable Swiss B2B CRM kit for Otok — organizations, companies, contacts, pipelines, audit, search, import/export. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-crm/README.md)         |
| `@kamod-ch/otok-kit-marketplace` | 1.0.0   | `composition` | application | Otok package @kamod-ch/otok-kit-marketplace                                                                          | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-marketplace/README.md) |
| `@kamod-ch/otok-kit-saas`        | 1.0.0   | `composition` | application | Billing kit — Stripe checkout, portal, webhooks, and subscriptions.                                                  | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-kit-saas/README.md)        |

## Preset

| Package                           | Version | Integration | Audience    | Summary                         | Docs                                                                                                |
| --------------------------------- | ------- | ----------- | ----------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@kamod-ch/otok-preset-crm`       | 1.0.0   | `scaffold`  | application | Official Otok crm preset.       | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-crm/README.md)       |
| `@kamod-ch/otok-preset-dashboard` | 1.0.0   | `scaffold`  | application | Official Otok dashboard preset. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-dashboard/README.md) |
| `@kamod-ch/otok-preset-kamod`     | 1.0.0   | `scaffold`  | application | Official Otok kamod preset.     | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-kamod/README.md)     |
| `@kamod-ch/otok-preset-minimal`   | 1.0.0   | `scaffold`  | application | Official Otok minimal preset.   | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-minimal/README.md)   |
| `@kamod-ch/otok-preset-saas`      | 1.0.0   | `scaffold`  | application | Official Otok saas preset.      | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-preset-saas/README.md)      |

## Tooling

| Package                        | Version | Integration          | Audience         | Summary                                                                                  | Docs                                                                                             |
| ------------------------------ | ------- | -------------------- | ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `create-otok`                  | 1.0.0   | `cli`, `scaffold`    | application      | Scaffold a new Otok app with presets, layers, and reproducible versions.                 | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/create-otok/docs/cli.md)      |
| `@kamod-ch/otok-registry`      | 1.0.0   | `cli`, `composition` | extension-author | Versioned extension registry for Otok — schema, cache, search, and compatibility checks. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-registry/README.md)      |
| `@kamod-ch/otok-route-typegen` | 1.0.0   | `core`               | extension-author | Route tree parsing, conflict detection, and TypeScript type generation for Otok apps.    | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-route-typegen/README.md) |
| `@kamod-ch/otok-test`          | 1.0.0   | `testing`            | extension-author | Official server-side and client testing utilities for Otok apps.                         | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-test/README.md)          |
| `otok-cli`                     | 1.0.0   | `cli`                | application      | CLI for Otok apps — add plugins, manage configuration.                                   | [cli-add](./cli-add.md)                                                                          |

## Migration

| Package                        | Version | Integration   | Audience    | Summary                                                                                 | Docs                                                                                             |
| ------------------------------ | ------- | ------------- | ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@kamod-ch/preactpress-compat` | 1.0.0   | `composition` | application | Compatibility layer for migrating PreactPress sites to Otok and @kamod-ch/otok-content. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/preactpress-compat/README.md) |

## Contract

| Package                          | Version | Integration | Audience         | Summary                                                                              | Docs                                                                                                |
| -------------------------------- | ------- | ----------- | ---------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `@kamod-ch/otok-plugin-contract` | 1.0.0   | `plugin`    | extension-author | Shared contract tests for Otok plugins — validates definePlugin hooks and lifecycle. | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-contract/README.md)  |
| `@kamod-ch/otok-plugin-fixture`  | 1.0.0   | `plugin`    | maintainer       | Otok plugin fixture used by tests to exercise multiple plugin hooks.                 | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-plugin-fixture/README.md)   |
| `otok-adapter-contract`          | 1.0.0   | `adapter`   | maintainer       | Shared contract tests and fixtures for Otok deployment adapters.                     | [package docs](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-contract/README.md) |
