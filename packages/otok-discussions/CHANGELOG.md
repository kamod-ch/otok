# @kamod-ch/otok-discussions

## 2.1.0

### Minor Changes

- b6212ab: Pre-release 0.1.0: subject-scoped discussions core, Kysely adapter (Postgres/SQLite), Otok HTTP plugin, Kamod UI subpath, moderation and security docs. Public API classified experimental until post-reference validation. No npm publish in this changeset — validation and documentation only.
- b6212ab: Add framework-agnostic domain core (status transitions, rules, Wilson ranking, scoped cursors) and process-local memory adapter with atomic in-process mutations.
- b6212ab: Add Otok plugin with SSR loaders (preview, thread, replies, permalink), progressive-enhancement form actions (CSRF, validation 422, idempotency fields), and optional Hono JSON API sharing the same services.
- b6212ab: Add `./kysely` export with versioned PostgreSQL/SQLite migrations, `createKyselyDiscussionAdapter`, cursor-based comment queries, and integration tests. Shared `DiscussionEngine` now backs memory and Kysely stores; one active ranking reaction per actor and comment.
- b6212ab: Introduce @kamod-ch/otok-discussions scaffold: public domain types, capability-based DiscussionAdapter, config validation, memory adapter, and testing providers.
- b6212ab: Add application services (`DiscussionService`, `CommentService`, `ModerationService`) with verified request context, subject resolution, visibility projection, spam provider fail-open/closed behavior, and concurrency-safe canonical thread get-or-create.
- b6212ab: Add optional SSR-first discussion UI via `./ui` and `./ui/islands`, Kamod component mapping, fixture page, and plugin route integration.
- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies
- Updated dependencies [00aac39]
  - @kamod-ch/otok-auth@2.1.0
  - @kamod-ch/otok@2.1.0
  - @kamod-ch/otok-queue@2.1.0
  - @kamod-ch/otok-realtime@2.1.0
  - @kamod-ch/otok-config@2.1.0
