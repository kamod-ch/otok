# Otok Benchmarks

Reproducible measurements for CI gates and scheduled performance profiles.

## Quick start (production — default PR gate)

```bash
pnpm -r --filter './packages/*' build
pnpm bench:otok          # BENCH_PROFILE=production
pnpm budget:check
```

Results: `benchmarks/results/latest.json`, `benchmarks/results/bundles.json`.

## Profiles

| `BENCH_PROFILE` | What it measures | Bundles file required |
| --------------- | ---------------- | --------------------- |
| `production` (default) | Playground production build, RSS, SSR `/` + `/about`, client JS | yes |
| `navigation` | Above + Playwright soft navigation | yes |
| `dev-start` | Vite dev cold spawn (5×) + warm HTML refetch on `apps/playground` | no |
| `worker-bundle` | Wrangler `deploy --dry-run` upload module sizes (`examples/deployment/cloudflare`) | no |
| `database` | `devjobs-reference` production `/jobs` with isolated Postgres | no |

Profiles are **not comparable** to each other (different origins, units, and runtime assumptions).

```bash
BENCH_PROFILE=dev-start pnpm bench:otok && BENCH_PROFILE=dev-start pnpm budget:check
BENCH_PROFILE=worker-bundle pnpm bench:otok && BENCH_PROFILE=worker-bundle pnpm budget:check
OTOK_BENCH_DATABASE_URL='postgres://…/otok_bench_test' BENCH_PROFILE=database pnpm bench:otok
```

## What production measures

- Production build duration + **sampled peak process-tree RSS** (Linux `/proc` only).
- Self-started `node dist/server/server.js` with health-checked readiness.
- SSR latency (p50/p95) and throughput for `/` (marker `Dashboard`) and `/about` (marker `Zero JS`).
- Total client JS gzip (KiB) and per-route **initial transfer** JS.

## Environment

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `BENCH_PROFILE` | `production` | See table above |
| `BENCH_PORT` | `4188` | Production playground server |
| `BENCH_DEV_PORT` | `5198` | Base port for dev-start cold runs |
| `OTOK_BENCH_DATABASE_URL` | _(required for database)_ | Isolated Postgres; DB name must match allowlist |
| `OTOK_BENCH_DATABASE_ALLOWLIST` | `bench,test,…` | Override isolation tokens |

## Tests

```bash
node --test benchmarks/profiles/*.test.mjs
pnpm test:gates
```

## CI

- PR/build: `production` when benchmark results are present.
- Weekly [`benchmark.yml`](../.github/workflows/benchmark.yml): separate jobs per profile; artifacts uploaded `if: always()`.

## Not gated here

- `benchmarks/projects/otok-minimal` cross-framework comparator (incomplete).
- Cloud edge geographic latency (worker profile is local bundle size only).

See [`docs/governance/performance-budgets.md`](../docs/governance/performance-budgets.md) and [`budgets.json`](./budgets.json).
