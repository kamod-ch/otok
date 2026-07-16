---
title: Built with Otok
section: Showcase
order: 100
---
# Built with Otok

## In-repository playground

The playground is the primary in-repository demo. It covers SSR, file routes, loaders, actions, progressive forms, route middleware, typed routes, islands, soft navigation, and the Node production build.

## In-repository reference applications

- `examples/reference-ai-audit` — route actions, progressive forms, API routes, expected errors, and island-based finding triage.
- `examples/reference-flat-cms` — public content, admin middleware, CRUD actions, method override, and live-preview islands.

These projects validate Otok APIs outside the playground before promotion as production showcases. CI runs `pnpm check:examples` against local package tarballs.

## External case study: kamod-ai-audit

[kamod-ai-audit](https://github.com/kamod-ch/kamod-ai-audit) is an external Kamod workflow used to pressure-test repository audit UX. Lessons that feed back into Otok:

- Keep audit dashboards server-rendered; hydrate islands only for triage filters.
- Prefer `validationError` / `fail` shapes that redisplay form values safely.
- Cookie-authenticated mutations need an explicit CSRF recipe (see Auth guide).
- Deterministic in-memory fixtures keep reference apps reproducible in CI.

Use the sibling `examples/reference-ai-audit` app for a self-contained, framework-only reproduction of the same patterns without product secrets.

## Promotion criteria

A project should move from reference to showcase after it:

1. builds and typechecks independently of the playground;
2. exercises actions, forms, or middleware in a real workflow;
3. documents deployment assumptions (Node today; Edge later).
