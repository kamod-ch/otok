# @otok/forum documentation

## Installation

```bash
pnpm add @otok/forum kysely better-sqlite3   # SQLite dev
pnpm add @otok/forum kysely pg              # PostgreSQL prod
```

Run migrations:

```ts
import { migrateForumSchema } from "@otok/forum/kysely";
await migrateForumSchema(db, "postgres"); // or "sqlite"
```

## Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | `string` | `"/community"` | URL prefix for all forum routes |
| `storage` | `ForumStorageAdapter` | *required* | Data access adapter |
| `auth` | `ForumAuthAdapter` | *required* | Current user resolution |
| `permissions` | `ForumPermissionsAdapter` | role defaults | Custom permission resolver |
| `components` | `ForumComponentOverrides` | built-in Preact UI | Override UI components |
| `markdown` | `ForumMarkdownAdapter` | markdown-it + sanitize | Render pipeline |
| `pagination.defaultPageSize` | `number` | `20` | List page size |
| `pagination.maxPageSize` | `number` | `100` | Max allowed page size |
| `moderation.reportReasons` | `string[]` | spam, harassment, … | Report form options |
| `notifications` | `ForumNotificationAdapter` | none | Optional reply/mention hooks |
| `spam` | `ForumSpamAdapter` | none | Optional spam check |
| `search` | `ForumSearchAdapter` | Kysely LIKE search | Replace with Meilisearch etc. |
| `messages` | `ForumMessageAdapter` | en/de catalog | UI strings |
| `rateLimit.windowMs` | `number` | `60000` | Rate limit window |
| `rateLimit.maxPosts` | `number` | `20` | Max posts per window |
| `rateLimit.maxThreads` | `number` | `5` | Max threads per window |
| `seo.siteName` | `string` | — | Site name for meta |
| `seo.origin` | `string` | — | Canonical URL origin |
| `locale` | `"en" \| "de"` | `"en"` | Default locale |

## Auth adapter

The forum never stores passwords or sessions. Provide external user IDs:

```ts
const auth: ForumAuthAdapter = {
  async getCurrentUser(ctx) {
    const session = await getSession(ctx.otok.request);
    if (!session) return null;
    return { id: session.userId, displayName: session.name, roles: session.roles };
  },
};
```

## otok-oauth integration

Resolve the authenticated user from Hono context set by `@kamod-ch/otok-auth`:

```ts
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";

async getCurrentUser({ otok }) {
  const session = await getAuthRuntime().helpers.getSession(otok.hono);
  if (!session?.user) return null;
  return { id: session.user.id, displayName: session.user.name, roles: session.roles };
}
```

## otok-i18n integration

Wrap the forum message adapter:

```ts
import { createMessageAdapter } from "@otok/forum";

messages: {
  t(key, params) {
    return i18n.t(`forum.${key}`, params); // delegate to otok-i18n
  },
  locale: currentLocale,
}
```

## Kamod UI customization

Override components via `createForum({ components: { Post, ThreadList } })`. See `examples/forum-demo/src/lib/kamod-components.ts`.

## Testing

```ts
import { createTestDatabase, createTestForum, createTestUser } from "@otok/forum/testing";
```

## Phase 2 roadmap

See [PHASE2.md](./PHASE2.md).
