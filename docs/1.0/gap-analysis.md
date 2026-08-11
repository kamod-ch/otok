# Otok 1.0 Gap Analysis

Prioritized work items derived from [audit.md](./audit.md).  
**Principle:** No breaking change without migration guide + compatibility decision.

---

## Priority Legend

| Priority | Meaning | Target |
|----------|---------|--------|
| **P0** | 1.0 blocker | Before RC |
| **P1** | Required for stable 1.0 | Before GA |
| **P2** | Strongly recommended | 1.0.x |
| **P3** | Post-1.0 improvement | 1.1+ |

---

## P0 — Blockers

| # | Gap | Action | Owner area |
|---|-----|--------|------------|
| P0-1 | No API stability enforcement | `api-stability.json` + `pnpm api:check` | Core |
| P0-2 | Missing `otok upgrade` | Implement upgrade command with dry-run | CLI |
| P0-3 | No SECURITY.md | Root security policy + disclosure | Governance |
| P0-4 | No 0.x→1.0 migration guide | [migration-guide-0.4-to-1.0.md](./migration-guide-0.4-to-1.0.md) | Docs |
| P0-5 | Version skew narrative unclear | Compatibility matrix + semver doc | Governance |
| P0-6 | No plugin contract package | `@kamod-ch/otok-plugin-contract` | Plugins |

---

## P1 — Required for GA

| # | Gap | Action |
|---|-----|--------|
| P1-1 | No benchmark regression CI | `benchmarks/` harness + budget checks |
| P1-2 | No bundle-size budgets | `benchmarks/budgets.json` + `pnpm budget:check` |
| P1-3 | Presets/kits untested | Smoke tests for preset resolution |
| P1-4 | No release checklist | [release-checklist.md](./release-checklist.md) |
| P1-5 | No maintainer handbook | [maintainer-handbook.md](./maintainer-handbook.md) |
| P1-6 | No release runbook | [release-runbook.md](./release-runbook.md) |
| P1-7 | No support matrix | [support-matrix.md](./support-matrix.md) |
| P1-8 | Canary releases undefined | `.github/workflows/canary.yml` |
| P1-9 | Reproducible builds undocumented | [reproducible-builds.md](../governance/reproducible-builds.md) |
| P1-10 | LTS strategy missing | [lts-strategy.md](../governance/lts-strategy.md) |

---

## P2 — Recommended

| # | Gap | Action |
|---|-----|--------|
| P2-1 | Cross-framework benchmarks manual only | Document fair comparison methodology |
| P2-2 | Telemetry absent | Opt-in module + transparent docs |
| P2-3 | RFC process informal | Formalize [rfc-process.md](../governance/rfc-process.md) |
| P2-4 | Contributor guide thin | Expand [contributor-guide.md](./contributor-guide.md) |
| P2-5 | API stability report not published | [api-stability-report.md](./api-stability-report.md) |
| P2-6 | `doctor` missing upgrade hints | Link doctor → upgrade suggestions |
| P2-7 | Typegen not in CI | Add typegen check to playground CI |

---

## P3 — Post-1.0

| # | Gap | Action |
|---|-----|--------|
| P3-1 | Plugin ecosystem version unification | Align all `@kamod-ch/*` major with registry |
| P3-2 | Automated dependency audit | Dependabot + npm audit in CI |
| P3-3 | Performance SLA for hosted adapters | Cloudflare cold-start monitoring |
| P3-4 | Visual regression testing | Playwright screenshot baselines |

---

## Compatibility Decisions (1.0)

These decisions avoid silent breaking changes:

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Core semver | `otok@1.0.0` with linked `@kamod-ch/otok-vite-plugin`, `create-otok` | Changesets linked group |
| Plugin majors | Keep independent semver; registry `otokVersion` is source of truth | Plugins already at 1.0–3.0 |
| Adapter API | Stable at 1.0.0 — no breaking changes in 1.0 cycle | Contract tests enforce |
| `./devtools` export | Remains **Experimental** until 1.1 review | Dev-only surface |
| Kit/preset APIs | **Experimental** until smoke tests + docs | 0.1.0 packages |
| Registry schema | Stable at 1.0.0 | Checksum + schema version |
| Minimum Node | 20 LTS (22 recommended) | engines field |

---

## Implementation Status

| Item | Status |
|------|--------|
| Audit document | Done |
| Gap analysis | Done |
| Governance policies | In progress |
| API stability manifest | In progress |
| Plugin contract | In progress |
| Benchmark harness | In progress |
| `otok upgrade` | In progress |
| SECURITY.md | In progress |
| Migration guide | In progress |
| Release checklist / runbook | In progress |

Update this table as items land.
