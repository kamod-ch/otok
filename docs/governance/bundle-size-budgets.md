# Bundle Size Budgets

Client and edge bundle sizes are capped for the minimal benchmark project.

## Limits (`benchmarks/budgets.json`)

| Artifact | Max (gzip) | Measurement |
|----------|------------|-------------|
| Client JS (entry + islands) | 45 KB | `vite build` + gzip |
| SSR server chunk | 120 KB | gzip |
| Cloudflare worker bundle | 250 KB | `wrangler deploy --dry-run` or esbuild meta |
| CSS (critical) | 8 KB | gzip |

## Methodology

1. Build `benchmarks/projects/otok-minimal` in production mode
2. Measure with `benchmarks/lib/measure-bundles.mjs`
3. Compare against budgets

## Exclusions

- `@kamod-ch/otok-kamod` and UI-heavy presets are **not** subject to minimal budgets
- Separate budgets for `preset-dashboard` may be added in 1.1

## CI

```bash
pnpm budget:check
```

Fails when any artifact exceeds budget by more than 5%.

## Reducing bundle size

Prefer:

- Tree-shakeable exports
- Lazy island loading
- Avoid pulling server code into client graph (enforced by `otok doctor`)
