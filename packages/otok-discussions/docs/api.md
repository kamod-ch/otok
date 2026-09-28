# Public API — `@kamod-ch/otok-discussions`

**Stability (0.1.0 pre-release):** All export subpaths are **experimental** until the first stable minor after field validation. Only documented symbols below are intended for app use.

## Runtime dependency notes

- **`./adapters/memory`** and **`./testing`** load without `@kamod-ch/otok` or `kysely` installed (verified via pack consumer).
- **Root entry** (`.`) re-exports HTTP cache helpers that import `@kamod-ch/otok/server` — install peer `@kamod-ch/otok` before **runtime** `import from "@kamod-ch/otok-discussions"`. Type-only imports work with `skipLibCheck`.
- **`./plugin`**, **`./ui`** require their documented peers at runtime.

## Export map

| Subpath             | Stability         | Role                                                           |
| ------------------- | ----------------- | -------------------------------------------------------------- |
| `.`                 | experimental      | Domain, services, config, ports, cache helpers, i18n factories |
| `./adapters/memory` | experimental      | In-process adapter (tests, prototypes)                         |
| `./kysely`          | experimental      | SQL schema, migrations, Postgres/SQLite adapter                |
| `./plugin`          | experimental      | Otok plugin factory + `CreateDiscussionsOptions`               |
| `./ui`              | experimental      | SSR Preact UI (requires peers)                                 |
| `./ui/islands`      | experimental      | Optional hydration islands                                     |
| `./i18n`            | experimental      | Message trees + `createDiscussionsI18n`                        |
| `./testing`         | internal-adjacent | Test doubles (not semver-guaranteed)                           |

## Core services

Use **only** with a verified `DiscussionRequestContext` (tenant + session from your auth middleware):

- `DiscussionService` — threads, `getOrCreateThread`, schedule fields (`opensAt`, `closesAt`)
- `CommentService` — list/create/edit, reactions, permalink projection, visibility
- `ModerationService` — queue, detail, publish/hide/reject, thread transitions, audit actions

Inject via `createDiscussions()` (`./plugin`) or construct manually with the same ports.

## Adapter contract (`DiscussionAdapter`)

Capabilities are explicit:

| Port            | Required keys                                                                | Notes                                                    |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `read`          | `getThread`, `listThreads`, `getComment`, `listComments`                     | Tenant isolation on every query                          |
| `mutate`        | `createThread`, `createComment`, `updateComment`, `deleteComment`, reactions | Optional `initialStatus` on create                       |
| `moderate`      | status transitions, reports, audit                                           | Kysely + memory implement full set                       |
| `transactional` | `runAtomic`                                                                  | Kysely uses DB transactions; memory uses in-process lock |

Missing capability → `DiscussionError` code `CAPABILITY_MISSING`.

Custom adapters must:

1. Scope all reads/writes by `DiscussionSubject` (`tenantId`, `subjectType`, `subjectId`).
2. Honor `resolveEffectiveThreadStatus` semantics (see domain rules) before accepting mutations.
3. Emit revision rows on comment edits when exposing `listRevisions`.

## Resolvers and policy

| Port                             | Responsibility                                                       |
| -------------------------------- | -------------------------------------------------------------------- |
| `SubjectResolver`                | Map route param → canonical subject; deny cross-tenant               |
| `ActorResolver`                  | Map session user id → `DiscussionActor` (roles for trust/moderation) |
| `DiscussionPolicy`               | Fine-grained `can(ctx, action)`                                      |
| `ModerationProvider.isModerator` | Per-subject moderator check                                          |
| `DiscussionsAuthAdapter`         | Cookie session + verified tenant scope for loaders/actions           |

## Error codes (`DiscussionError.code`)

| Code                      | Typical cause                                            |
| ------------------------- | -------------------------------------------------------- |
| `INVALID_INPUT`           | Zod/body validation, empty markdown                      |
| `NOT_FOUND`               | Wrong tenant, missing thread/comment                     |
| `FORBIDDEN`               | Policy, closed thread, depth exceeded, CSRF (HTTP layer) |
| `CONFLICT`                | Optimistic revision mismatch                             |
| `RATE_LIMITED`            | Capability rate limiter                                  |
| `ACTOR_REQUIRED`          | Mutation without session                                 |
| `SUBJECT_DENIED`          | Subject resolver rejected context                        |
| `INVALID_TRANSITION`      | Illegal thread/comment status change                     |
| `CAPABILITY_MISSING`      | Adapter port not implemented                             |
| `TRANSACTION_UNSUPPORTED` | Adapter without `runAtomic`                              |
| `PROVIDER_UNAVAILABLE`    | Spam/rate provider failure (mode-dependent)              |
| `NOT_CONFIGURED`          | Plugin/middleware not wired                              |

HTTP plugin maps these to 403/404/422/409/429 per Otok conventions.

## Domain events

Inject an `EventSink` via `DiscussionsRuntimeDeps`. Payload helpers live in `src/events/payloads.ts` (not re-exported from root yet — use your own envelope or copy minimal fields):

| Event name                          | When                                     |
| ----------------------------------- | ---------------------------------------- |
| `discussion.comment.created`        | After successful create                  |
| `discussion.comment.updated`        | After edit                               |
| `discussion.comment.status_changed` | Moderation visibility change             |
| `discussion.reaction.changed`       | Add/remove reaction                      |
| `discussion.report.created`         | New report (deduped per reporter/target) |
| `discussion.thread.status_changed`  | open/read_only/closed/…                  |

Payload version field: `v: 1` (`DISCUSSION_EVENT_VERSION`).

## Schema and upgrade path

- SQL migrations ship under `./kysely` (`migrateDiscussionsSchema(db, dialect, direction)`).
- **Breaking schema changes** require a new dated migration file; document in `docs/upgrades.md`.
- **Status model** (`CommentStatus`, `DiscussionThreadStatus`) changes require:
  1. Migration for stored enums/check constraints (Postgres).
  2. Domain transition table update in `domain/transitions.ts`.
  3. Entry in `docs/upgrades.md` with backfill steps.

Do not rely on undocumented columns in `discussions_*` tables.
