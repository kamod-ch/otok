# Release notes — `@kamod-ch/otok-discussions@0.1.0-next`

**Status:** Pre-release validation complete in monorepo. **Not published** to npm.

## Highlights

- Headless domain core with memory and Kysely adapters (PostgreSQL + SQLite tested)
- Application services (discussion, comment, moderation) with tenant isolation and visibility rules
- Otok plugin: SSR routes, CSRF-aware actions, optional moderation UI routes, optional JSON API
- Kamod/Preact UI subpath (`./ui`, `./ui/islands`) without React/Radix dependencies
- i18n (de/en), moderation lifecycle, rate-limit and cache policy helpers, security docs

## Export subpaths

`.`, `./adapters/memory`, `./kysely`, `./plugin`, `./ui`, `./ui/islands`, `./i18n`, `./testing`

## Breaking changes

None (initial release).

## Upgrade

First install: run `migrateDiscussionsSchema` — see `docs/upgrades.md`.

## Known gaps before npm `0.1.0`

- Register package in root API stability baseline (experimental classification)
- Optional: add `@kamod-ch/otok-discussions` to root `check:pack-consumer` CI matrix
- JSON API and public HTML cache remain opt-in / alpha maturity

## Contributors

See monorepo changesets under `.changeset/otok-discussions-*.md` (consolidated at publish time).
