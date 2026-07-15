# Otok Reference: Flat CMS

A realistic Otok application for a flat-file style content management workflow.

It demonstrates:

- public pages with no required client JavaScript
- admin routes with colocated route middleware
- route actions for create, update, and delete
- `_method=DELETE` form override
- progressive forms
- field-level validation
- API route integration through Hono
- opt-in editor live-preview island
- Node production entrypoint

The example stores posts in memory. Replace `src/app/data/posts.ts` with markdown files, Git-backed storage, or object storage for a real deployment.

## Run

```bash
pnpm install
pnpm dev
```

## Production

```bash
pnpm build
PORT=3000 HOST=0.0.0.0 pnpm preview
```
