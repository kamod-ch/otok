# Otok 1.0 Preparation

Systematic preparation for the Otok 1.0 release.

## Documents

| Document | Purpose |
|----------|---------|
| [audit.md](./audit.md) | Full readiness audit |
| [gap-analysis.md](./gap-analysis.md) | Prioritized gaps and status |
| [migration-guide-0.4-to-1.0.md](./migration-guide-0.4-to-1.0.md) | User migration path |
| [api-stability-report.md](./api-stability-report.md) | Public API guarantee |
| [release-checklist.md](./release-checklist.md) | Pre-release checklist |
| [release-runbook.md](./release-runbook.md) | Maintainer release steps |
| [maintainer-handbook.md](./maintainer-handbook.md) | Ongoing maintainer duties |
| [contributor-guide.md](./contributor-guide.md) | Extended contributor guide |
| [support-matrix.md](./support-matrix.md) | Platform support |
| [compatibility-decisions.md](./compatibility-decisions.md) | Breaking change log |

## Governance

See [`docs/governance/`](../governance/) for SemVer, deprecation, RFC, LTS, budgets, telemetry.

## Tooling

```bash
pnpm api:check           # API stability manifest
pnpm budget:check        # Performance budgets
pnpm bench:otok          # Self-benchmark
pnpm reproducible:check  # Lockfile / environment
otok doctor              # Project health
otok upgrade --dry-run   # Upgrade plan
```

## Machine-readable

- [`api-stability.json`](../../api-stability.json)
- [`benchmarks/budgets.json`](../../benchmarks/budgets.json)
