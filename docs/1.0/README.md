# Otok 1.0 Preparation

Systematic preparation for the Otok 1.0 release.

## Documents

| Document | Purpose |
|----------|---------|
| [release-candidate.md](./release-candidate.md) | **Current** stabilization RC (verify, blockers, tag recommendation) |
| [audit.md](./audit.md) | Historical readiness audit (2026-08-03) |
| [gap-analysis.md](./gap-analysis.md) | Prioritized gaps + stabilization status |
| [migration-stabilization.md](./migration-stabilization.md) | Cache, idempotency, forms, providers (0.6.x+) |
| [migration-guide-0.4-to-1.0.md](./migration-guide-0.4-to-1.0.md) | User migration path to 1.0 |
| [maturity-matrix.md](./maturity-matrix.md) | Verified runtime/provider combinations |
| [operations-node-postgres.md](./operations-node-postgres.md) | Web + worker, health, deploy |
| [known-limitations.md](./known-limitations.md) | Memory providers, cron UTC, gaps |
| [api-stability-report.md](./api-stability-report.md) | Public API guarantee |
| [release-checklist.md](./release-checklist.md) | Script-backed pre-release checklist |
| [release-runbook.md](./release-runbook.md) | Maintainer release steps |
| [maintainer-handbook.md](./maintainer-handbook.md) | Ongoing maintainer duties |
| [contributor-guide.md](./contributor-guide.md) | Extended contributor guide |
| [support-matrix.md](./support-matrix.md) | Platform support |
| [compatibility-decisions.md](./compatibility-decisions.md) | Breaking change log |

## Governance

See [`docs/governance/`](../governance/) for SemVer, deprecation, RFC, LTS, budgets, telemetry.

## Tooling

```bash
pnpm release:check       # Full RC gate (no publish)
pnpm api:check           # API stability manifest
pnpm test:gates          # Gate script self-tests
pnpm budget:check        # Performance budgets
pnpm bench:otok          # Self-benchmark
pnpm reproducible:check  # Lockfile / environment
otok doctor              # Project health
otok upgrade --dry-run   # Upgrade plan (when available)
```

## Machine-readable

- [`api-stability.json`](../../api-stability.json)
- [`benchmarks/budgets.json`](../../benchmarks/budgets.json)
