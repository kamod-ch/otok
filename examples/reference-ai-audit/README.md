# Otok Reference: AI Audit

A realistic Otok application that models an AI-assisted repository audit product without calling an external AI API.

It demonstrates:

- server-rendered dashboard and detail pages
- route actions with field-level validation
- progressive form enhancement
- expected 400 failures and redirects
- API routes registered through Hono
- `notFound()` for missing records
- opt-in island hydration for finding triage
- production Node server settings

## Run

```bash
pnpm install
pnpm dev
```

This example is intentionally self-contained and stores data in memory so it can be copied out of the monorepo as a starting point.

## Production

```bash
pnpm build
PORT=3000 HOST=0.0.0.0 pnpm preview
```
