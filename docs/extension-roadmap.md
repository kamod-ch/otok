# Otok extension roadmap (current)

Optional packages around Otok core. Core stays free of auth, validation, database, and UI dependencies.

**Authoritative package list:** [Ecosystem catalog](../apps/docs/content/guides/ecosystem.md) · [Category guides](../apps/docs/content/guides/ecosystem-data-and-platform.md) · [`docs/ecosystem-catalog.json`](./ecosystem-catalog.json)

## Plugin system

Typed plugin API via `@kamod-ch/otok-config`, integrated by `@kamod-ch/otok-vite-plugin`:

- `defineConfig` / `definePlugin`
- `otok.config.ts` with deterministic hook order
- `virtual:otok-config` runtime bridge
- Registry-backed discovery: `pnpm otok add <alias>`

See [Plugins guide](../apps/docs/content/guides/plugins.md) and [ADR 0006](./adr/0006-plugin-system.md).

Composition packages remain valid without plugin wrappers — see [Composition packages](../apps/docs/content/guides/extensions.md).

## Intentionally deferred

- Generic OIDC provider — add when a concrete flow is scoped
- Account linking UX beyond existing adapter hooks
- Better Auth adapter (`otok-better-auth`) — see [auth architecture](./auth-architecture.md)

## Plugin system follow-ups

- Render hooks (`transformHtml`) and programmatic `registerRoutes` — shipped (ADR 0007)
- Richer Devtools metadata beyond the base panel

## Historical note

Per-package “shipped” narratives and extraction order from early 2026 lived in this file before the ecosystem catalog existed. For versioned, machine-checked inventory use the generated catalog rather than duplicating package lists here.
