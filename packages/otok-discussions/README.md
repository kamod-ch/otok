# @kamod-ch/otok-discussions

Subject-scoped discussions for [Otok](https://github.com/kamod-ch/otok): threads and comments bound to **your** resources (job, article, ticket), with optional SSR UI, Kysely persistence, and moderation.

**Version:** `0.1.0` (pre-release — experimental public API; see [maturity matrix](./docs/maturity-matrix.md)).

## When to use this package

| Use discussions | Use `@kamod-ch/otok-forum` instead |
| --------------- | ----------------------------------- |
| Comments on a **specific app entity** | Global categories, forum-first UX |
| Embed preview + full thread on entity pages | Standalone community product |
| Shared auth/tenant/CSRF with Otok routes | Forum-specific navigation |

**Features (verified in 0.1.0):**

- Multi-tenant subjects, thread lifecycle, nested comments, reactions, reports
- Moderation modes (`pre` / `post` / `trusted`), queue + audit actions
- Effective auto-close via `closesAt` (not a fixed 24h default — **you** set the timestamp, e.g. 24h after publish)
- SSR-first forms (works without JS), optional Preact islands
- PostgreSQL + SQLite via Kysely; memory adapter for tests
- i18n (de/en), accessibility patterns, rate-limit hooks, cache policy helpers

## Installation

```bash
pnpm add @kamod-ch/otok-discussions
```

**Core only** (no UI, no DB):

```bash
pnpm add @kamod-ch/otok-discussions zod
```

**With Kysely (Postgres/SQLite in your app):**

```bash
pnpm add @kamod-ch/otok-discussions kysely pg   # or better-sqlite3 for sqlite
```

**With Otok plugin + UI:**

```bash
pnpm add @kamod-ch/otok-discussions @kamod-ch/otok @kamod-ch/otok-auth preact @kamod-ch/ui @kamod-ch/icons hono
```

Peers are optional per subpath — see `package.json` `peerDependenciesMeta`.

## Minimal configuration (plugin)

```ts
import { defineConfig } from "@kamod-ch/otok";
import discussions from "@kamod-ch/otok-discussions/plugin";
import { createKyselyDiscussionAdapter, createDiscussionsRuntime } from "@kamod-ch/otok-discussions/kysely";

export default defineConfig({
  plugins: [
    discussions({
      basePath: "/discussions",
      subjectType: "article",
      adapter: createKyselyDiscussionAdapter({ db, deps, config: { moderationMode: "post" } }),
      runtime: createDiscussionsRuntime({}, deps),
      auth: myDiscussionsAuthAdapter,
      subjectResolver: mySubjectResolver,
      actorResolver: myActorResolver,
      policy: myPolicy,
      moderation: myModerationProvider,
    }),
  ],
});
```

See [`examples/discussions-reference`](../../examples/discussions-reference) for auth, tenants, seeds, and Playwright checks.

## Adapters

### Memory (`./adapters/memory`)

In-process, single-node. Reactions/reports supported; **not** for production persistence.

```ts
import { createMemoryDiscussionAdapter } from "@kamod-ch/otok-discussions/adapters/memory";
import { createTestProviders } from "@kamod-ch/otok-discussions/testing";

const adapter = createMemoryDiscussionAdapter({ deps: createTestProviders() });
```

### Kysely (`./kysely`)

```ts
import { migrateDiscussionsSchema, createKyselyDiscussionAdapter } from "@kamod-ch/otok-discussions/kysely";

await migrateDiscussionsSchema(db, "postgres", "up");
const adapter = createKyselyDiscussionAdapter({ db, deps, config: { moderationMode: "post", maxDepth: 8 } });
```

Details: [`docs/kysely.md`](./docs/kysely.md), upgrades: [`docs/upgrades.md`](./docs/upgrades.md).

## Auth, subject, and tenant

1. **`DiscussionsAuthAdapter.resolveVerifiedScope`** — Must return `{ tenantId, sessionUserId }` from **verified** session/cookie data (never trust client-sent tenant id alone).
2. **`SubjectResolver`** — Confirms `subjectId` belongs to `tenantId` (load your entity).
3. **`ActorResolver`** — Maps user id → roles (`discussions_trusted`, `moderator`, …).
4. **`ModerationProvider.isModerator(actor, subject)`** — Tenant-scoped moderation.

CSRF: enable `@kamod-ch/otok-auth` session cookies; plugin uses `CSRF_FIELD` on mutations.

## SSR / no-JS and UI

Plugin routes render HTML forms (comment, reaction, report, moderation). Progressive enhancement only adds islands from `./ui/islands`.

```tsx
import { Discussion, discussionViewModelFromPageData } from "@kamod-ch/otok-discussions/ui";
```

UI peers: **Preact**, `@kamod-ch/ui`, `@kamod-ch/icons` (Kamod design system — **no** React/Radix in this package). DB drivers are not imported from `./ui` (see `scripts/verify-ui-artifacts.mjs`).

UI guide: [`docs/ui.md`](./docs/ui.md).

## Moderation modes and auto-close

| `moderationMode` | New comment default status |
| ---------------- | --------------------------- |
| `post` | `published` (spam provider may force `pending`) |
| `pre` | `pending` |
| `trusted` | `published` if actor has configured `trustedRole` |

Thread **auto-close**: set `closesAt` ISO timestamp on thread create/update. On each read/mutation, effective status becomes `closed` when `now >= closesAt` (see [`docs/moderation.md`](./docs/moderation.md)). Example: `closesAt = new Date(Date.now() + 24 * 3600_000).toISOString()` for a 24h window.

## Security, privacy, operations

- Threat model: [`docs/security-threat-model.md`](./docs/security-threat-model.md)
- Production hardening (rate limits, cache, logging): [`docs/security-production.md`](./docs/security-production.md)
- Idempotency: [`docs/http-idempotency.md`](./docs/http-idempotency.md)
- Markdown processing: `processCommentBodyForStorage` (no raw HTML from users)

**Privacy:** Host app owns PII (display names, emails). Package stores author ids and markdown you supply; configure retention in your DB policies.

**Ops:** Run migrations before deploy; set `OTOK_DISCUSSIONS_PG_TEST_URL` in CI for Postgres integration tests.

## Public API reference

- [`docs/api.md`](./docs/api.md) — exports, adapter contract, error codes, events
- [`docs/maturity-matrix.md`](./docs/maturity-matrix.md) — what is safe to promise

## Tested runtimes and databases

| Runtime | Support |
| ------- | ------- |
| Node.js | `>=20` (22.x in monorepo CI) |
| Edge | Not targeted for Kysely adapter (use HTTP API to Node backend) |

| Database | Tests |
| -------- | ----- |
| SQLite | Default integration suite |
| PostgreSQL | With `OTOK_DISCUSSIONS_PG_TEST_URL` |

## Known limitations (0.1.0)

- No bundled outbox — wire `EventSink` yourself.
- JSON API is opt-in and less tested than SSR routes.
- Multi-instance idempotency depends on Otok idempotency store (Postgres) for actions.
- Memory adapter is single-process only.
- Experimental semver on all subpaths until `0.2.0` stabilization review.

## Development & release checks

```bash
pnpm --filter @kamod-ch/otok-discussions release:preflight
```

Individual steps: `build`, `typecheck`, `test`, `verify:ui`, `test:pack-consumer`.

Release notes (unpublished): [`RELEASE-NOTES-0.1.0-next.md`](./RELEASE-NOTES-0.1.0-next.md).
