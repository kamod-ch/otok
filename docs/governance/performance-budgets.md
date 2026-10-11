# Performance Budgets

Otok performance budgets are split into **profiles** in [`benchmarks/budgets.json`](../../benchmarks/budgets.json) (schema v2.1). Profiles are measured independently; do not compare dev-start timings to worker KiB or database listing latency.

## Profiles

| Profile | Purpose |
| ------- | ------- |
| `production` (default) | CI gate — playground production build, RSS, Node SSR for `/` and `/about`, bundles |
| `navigation` | Optional Chromium soft-navigation (`BENCH_PROFILE=navigation`) |
| `dev-start` | Vite dev server cold process start + warm HTML refetch (`apps/playground`) |
| `worker-bundle` | Cloudflare Worker **upload** module size via `wrangler deploy --dry-run` (no Cloud RTT) |
| `database` | `examples/devjobs-reference` `/jobs` with `OTOK_BENCH_DATABASE_URL` |

## Metrics (production)

| Metric | Meaning |
| ------ | ------- |
| `productionBuildMs` | `pnpm --filter playground build` wall time |
| `buildPeakRssMb` / `serverPeakRssMb` | Sampled peak process-tree RSS (Linux `/proc`) |
| `clientJsGzipKiB` | Total gzipped client JS (KiB = 1024 bytes) |
| Per-scenario SSR latency / throughput | See `benchmarks/README.md` |

## Metrics (dev-start)

| Metric | Unit | Gate |
| ------ | ---- | ---- |
| `devServerColdStartP50Ms` / `P95Ms` | ms | Hard (historical target ≤3000 ms p50) |
| `devServerWarmHtmlP50Ms` / `P95Ms` | ms | Informational |
| `devServerColdSamples` / `WarmSamples` | count | Minimum 5 |

Cold: separate Vite dev processes until first valid HTML with dashboard marker. Warm: same process, `cache: no-store` refetch latency.

## Metrics (worker-bundle)

| Metric | Unit | Gate |
| ------ | ---- | ---- |
| `edgeBundleUploadKiB` | KiB | Hard (historical target ≤250 KiB raw upload modules) |
| `edgeBundleUploadGzipKiB` | KiB | Informational |
| `edgeBundleModuleCount` | count | Minimum 1 |

Static client assets under `assets/` are reported separately and **not** counted toward upload module sum.

## Metrics (database)

| Metric | Unit | Gate |
| ------ | ---- | ---- |
| `jobsListingDbColdP50Ms` / `P95Ms` | ms | Informational (calibration pending) |
| `jobsListingCachedP50Ms` / `P95Ms` | ms | Informational (SSR public cache, not DB-only) |
| `jobsListingRequestErrors` | count | Hard max 0 |

Cold samples use unique `_bench` query params to bypass SSR page cache. Requires allowlisted benchmark database name (`OTOK_BENCH_DATABASE_URL`).

## Regression policy

| Change | Action |
|--------|--------|
| Within `tolerancePercent` above max | Warning |
| Beyond tolerance (non-informational) | CI failure |
| Informational exceedance | Warning only |
| Below `min` beyond tolerance | Failure |

## Local run

```bash
pnpm -r --filter './packages/*' build
pnpm bench:otok
pnpm budget:check
```

Other profiles: set `BENCH_PROFILE` as documented in [`benchmarks/README.md`](../../benchmarks/README.md).

## Calibration status

- **production / navigation:** active CI gates.
- **dev-start / worker-bundle:** hard gates on documented historical targets; warm/cache metrics informational.
- **database:** completeness + zero-error gate; latency thresholds informational until a baseline series is recorded.
