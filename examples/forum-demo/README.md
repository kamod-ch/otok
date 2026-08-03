# Otok Forum Demo

Minimal example showing `@otok/forum` mounted via the Otok plugin API.

## Setup

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Open http://localhost:3456/community

## Demo users

| ID | Role |
|----|------|
| `alice` | member (default) |
| `bob` | moderator |
| `admin` | admin |

Switch users by modifying `src/lib/auth.ts`.

## Features demonstrated

- SQLite + Kysely storage
- German locale (via `locale: "de"`)
- Categories: Otok Framework, Showcase, Hilfe und Support
- SSR forms (no JavaScript required)
- Plugin `registerRoutes` mounting

## Kamod UI

See `@otok/forum` docs for overriding `components` with Kamod UI primitives.
