# Otok Benchmarks

Reproducible performance measurements for Otok 1.0 readiness.

## Principles

- **Fair comparison:** Each framework uses a minimal SSR page with equivalent HTML output
- **No unfair configs:** Default production settings; no debug middleware disabled on competitors only
- **Reproducible:** Record git SHA, Node version, lockfile hash

## Quick start (Otok self-benchmark)

```bash
pnpm bench:otok
pnpm budget:check
```

Results written to `benchmarks/results/latest.json`.

## Metrics

| Metric | Description |
|--------|-------------|
| `devServerStartMs` | Time until dev server accepts HTTP |
| `productionBuildMs` | `vite build` duration |
| `ssrLatencyP50Ms` | Median SSR response time (local) |
| `ssrThroughputRps` | Requests/sec (autocannon, 10s) |
| `clientJsKb` | Gzipped client JS for home route |
| `edgeBundleKb` | Worker bundle size (when applicable) |
| `peakRssMb` | Peak RSS during production build |

Budgets: [`budgets.json`](./budgets.json). See [performance-budgets.md](../docs/governance/performance-budgets.md).

## Cross-framework comparison

Compare against equivalent minimal projects:

| Framework | Project path | Notes |
|-----------|--------------|-------|
| **Otok** | `projects/otok-minimal` | Reference |
| **Hono** | `projects/hono-minimal` | Raw Hono + JSX SSR |
| **Astro** | `projects/astro-minimal` | Default SSR, no islands |
| **React Router** | `projects/react-router-minimal` | Framework mode |
| **Next.js** | `projects/next-minimal` | App router |
| **SvelteKit** | `projects/sveltekit-minimal` | Adapter-node |

```bash
pnpm bench:compare
```

See [`specs/minimal-ssr.md`](./specs/minimal-ssr.md) for equivalence rules.

## CI

Benchmark workflow runs on `workflow_dispatch` and weekly schedule.  
PR CI runs `budget:check` only when `benchmarks/results/latest.json` exists (optional artifact).

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BENCH_GIT_SHA` | `git rev-parse HEAD` | Reproducibility |
| `BENCH_URL` | `http://127.0.0.1:3000` | SSR target |
| `BENCH_DURATION_S` | `10` | Throughput test duration |

## Adding a framework

1. Create `projects/<name>-minimal` following `specs/minimal-ssr.md`
2. Add entry to `bench-compare.mjs`
3. Document install size and config in project README
