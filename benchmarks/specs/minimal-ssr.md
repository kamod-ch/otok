# Minimal SSR Benchmark Spec

All cross-framework benchmark projects must implement this equivalent page.

## Page requirements

- Single route: `GET /`
- HTML response with:
  - `<title>Benchmark</title>`
  - `<h1>Hello, Benchmark</h1>`
  - Server-rendered timestamp (ISO string) in `<p>`
  - No database, no auth, no external API calls
- Response status: 200
- Content-Type: text/html

## Optional interactivity (Otok only for minimal tier)

Otok minimal may include **one** counter island. Other frameworks: static SSR only for apples-to-apples SSR metrics.

Separate tier `*-with-island` for hydration comparisons.

## Build requirements

- Production build command documented in `package.json`
- Dev server on port 3000 (or `PORT` env)
- Node 22, default framework configs (no custom webpack overrides)

## Measurement fairness

| Rule | Rationale |
|------|-----------|
| Cold start: process spawn → first 200 | No pre-warmed workers |
| Warm SSR: 5 samples, report median | Reduce noise |
| Throughput: autocannon 10s, 10 connections | Single machine |
| Build: clean `node_modules` not required; clean `dist` yes | CI practicality |
| Install size: `node_modules` after `pnpm install` | Document package manager |

## Excluded from comparison

- Image optimization pipelines
- CDN edge locations (local only)
- Database connection pools
- Custom caching layers (except framework defaults)

## Validation

Each project includes `verify.mjs` that fetches `/` and asserts title + h1 present.
