# Performance Budgets

Otok 1.0 defines performance budgets for **minimal reference apps**.
Budgets are checked in CI against Otok self-benchmarks; cross-framework comparison is informational.

## Budget file

Thresholds live in [`benchmarks/budgets.json`](../../benchmarks/budgets.json).

## Metrics

| Metric | Budget (Otok minimal) | Unit |
|--------|----------------------|------|
| `devServerStartMs` | ≤ 3000 | ms |
| `productionBuildMs` | ≤ 45000 | ms |
| `ssrLatencyP50Ms` | ≤ 15 | ms (local) |
| `ssrThroughputRps` | ≥ 500 | req/s (local, single core) |
| `clientJsKb` | ≤ 45 | KB gzip (home route) |
| `edgeBundleKb` | ≤ 250 | KB (Cloudflare worker) |
| `peakRssMb` | ≤ 256 | MB during build |

## Scope

Budgets apply to `benchmarks/projects/otok-minimal` — a single-route SSR app with one island, comparable to other framework minimal templates.

## Regression policy

| Change | Action |
|--------|--------|
| ≤ 5% regression | Warning in CI |
| > 5% regression | CI failure; requires RFC or budget update |
| Improvement | Update baseline in PR |

## Cross-framework comparison

Benchmarks against Hono, Astro, React Router, Next.js, and SvelteKit use **equivalent minimal SSR pages** (see `benchmarks/specs/minimal-ssr.md`).
Otok budgets are **not** compared directly to other frameworks in CI — only tracked in reports.

## Local run

```bash
pnpm bench:otok
pnpm budget:check
```
