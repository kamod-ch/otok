# @otok/forum

Production-ready optional forum extension for [Otok](https://github.com/kamod-ch/otok) — SSR-first, Kysely-backed, permission-based community features.

## Quick start

```bash
pnpm add @otok/forum kysely
```

```ts
import { createForum } from "@otok/forum";
import { createKyselyForumStorage, migrateForumSchema } from "@otok/forum/kysely";
import forumPlugin from "@otok/forum/plugin";

const storage = createKyselyForumStorage(db);
await migrateForumSchema(db, "sqlite");

const forum = createForum({
  basePath: "/community",
  storage,
  auth: myAuthAdapter,
  locale: "de",
});

// Option A: merge routes in server bootstrap
createOtokApp({ routes: [...fileRoutes, ...forum.routes] });

// Option B: Otok plugin (ADR 0007 programmatic routes)
export default defineConfig({
  plugins: [forumPlugin({ basePath: "/community", storage, auth: myAuthAdapter })],
});
```

See [docs/](./docs/) for full configuration, adapters, migrations, and deployment.

## Features

- SSR Preact UI with progressive enhancement (no required client JS)
- Kysely storage (PostgreSQL + SQLite)
- Role-based permissions (`guest`, `member`, `moderator`, `admin`)
- Threads, posts, tags, reactions, subscriptions, read states
- Moderation queue, reports, audit events
- Portable search adapter with Kysely default
- i18n message adapter (English + German defaults)
- SEO: meta tags, canonical URLs, Open Graph, RSS, JSON-LD

## Exports

| Subpath | Purpose |
|---------|---------|
| `@otok/forum` | `createForum`, types, services |
| `@otok/forum/kysely` | Schema, migrations, storage adapter |
| `@otok/forum/testing` | Test factories, SQLite helpers |
| `@otok/forum/plugin` | Otok plugin with `registerRoutes` |

## Example

See `examples/forum-demo` in the Otok repository.

## License

MIT
