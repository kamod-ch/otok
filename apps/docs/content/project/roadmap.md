---
title: Project Roadmap
section: Project
order: 90
---
# Project Roadmap

## Phase 1 (complete in 0.2.0–0.3.x)

Delivered:

- shared response and validation semantics (`redirect`, `notFound`, `fail`, `validationError`)
- route actions and progressive forms
- route middleware
- typed route builder
- `@otok/test` utilities including `parseHtml`
- browser E2E matrix for the playground
- Node deployment guides and smoke tests
- documentation site
- Changesets release automation
- in-repo reference projects under `examples/`

## Phase 1 hardening (0.4.x)

- multi-browser Playwright coverage
- playground independence from local Kamod UI paths
- deeper migration guides
- external showcase projects

## Phase 2 (1.x)

- Edge / Worker runtime adapter
- opt-in streaming SSR
- i18n patterns via optional `[[lang]]` routes

Otok avoids premature abstractions such as a general plugin system until real applications prove the need.

## Release Policy

Otok uses Changesets. User-visible package changes should include a changeset. Releases must pass checks, E2E, and pack dry runs.

## Contributing

Keep the core small, prefer Web standards, and avoid adding framework dependencies for UI, validation, databases, or auth.
