# Reference Projects

Otok keeps two realistic reference projects in `examples/` instead of adding them to the pnpm workspace.

This keeps the framework packages small, avoids coupling Otok Core to application-layer choices, and makes each reference app copyable into a standalone repository.

## AI Audit

Path: `examples/reference-ai-audit`

A repository audit workflow that demonstrates:

- server-rendered dashboard and detail pages
- route actions with validation failures and redirects
- progressive form enhancement
- Hono API routes
- `notFound()` behavior
- opt-in island hydration for client-side triage
- Node production entrypoint

The app uses deterministic in-memory findings. It does not call an external AI service, so the example remains reproducible.

## Flat CMS

Path: `examples/reference-flat-cms`

A flat-file style CMS that demonstrates:

- public content pages without required client JavaScript
- admin route middleware
- create, update, and delete actions
- `_method=DELETE` form override
- field-level validation
- Hono API route integration
- opt-in live-preview island
- Node production entrypoint

The app stores posts in memory. Replace its data module with markdown files, Git-backed content, or object storage for real deployments.

## Running a reference app

```bash
cd examples/reference-ai-audit
pnpm install
pnpm dev
```

or:

```bash
cd examples/reference-flat-cms
pnpm install
pnpm dev
```

## Promotion criteria

A project should only be moved from reference to showcase after it has been used outside the playground and validates Otok APIs in a real workflow.

## External case study

`kamod-ai-audit` (sibling Kamod workspace project) exercises audit-style dashboards that inspired `examples/reference-ai-audit`. Prefer the in-repo example for CI-safe demos; keep the external app for product-specific integrations.
