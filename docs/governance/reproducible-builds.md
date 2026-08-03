# Reproducible Builds

Otok aims for deterministic, auditable build outputs for published packages.

## Requirements

| Requirement | Implementation |
|-------------|----------------|
| Locked dependencies | `pnpm-lock.yaml` committed; CI uses `--frozen-lockfile` |
| Node version pinned | `.nvmrc` / CI matrix Node 22 |
| pnpm version pinned | `packageManager` field in root `package.json` |
| npm provenance | `npm_config_provenance=true` in publish workflow |
| Clean build | `rm -rf dist && tsc` in each package |
| No local paths in published tarballs | `pnpm pack:check` dry-run |

## CI verification

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm pack:check
```

## Source maps

Published packages include declaration maps for debugging; production apps should not rely on repo paths in stack traces.

## Benchmark reproducibility

Benchmarks record:

- Git commit SHA (`BENCH_GIT_SHA`)
- Node version
- Lockfile hash (first 12 chars of sha256)

See `benchmarks/README.md`.

## Verification script

```bash
pnpm reproducible:check
```

Compares lockfile hash and documents expected environment.

## Container builds (optional)

For deployment reproducibility, pin base images:

```dockerfile
FROM node:22-bookworm-slim@sha256:<digest>
```

Document digests in deployment examples.
