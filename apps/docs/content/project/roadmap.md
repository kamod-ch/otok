---
title: Project Roadmap
section: Project
order: 90
---
# Project Roadmap

Phase 1 focuses on production readiness:

- shared response and validation semantics
- route actions and progressive forms
- route middleware
- typed route builder
- testing utilities
- browser E2E matrix
- Node deployment
- documentation
- release automation
- reference projects

Otok avoids premature abstractions such as a general plugin system until real applications prove the need.

## Release Policy

Otok uses Changesets. User-visible package changes should include a changeset. Releases must pass checks, E2E, and pack dry runs.

## Contributing

Keep the core small, prefer Web standards, and avoid adding framework dependencies for UI, validation, databases, or auth.
