# Otok 1.0 Gap Analysis

Prioritized work items derived from [audit.md](./audit.md) (**2026-08-03**, core `@0.4.0` at audit time).

**Current stabilization / RC:** see [release-candidate.md](./release-candidate.md) and [../stabilization/status.md](../stabilization/status.md). This file keeps the **historical 1.0 backlog**; status tables below distinguish audit-era gaps from 2026 stabilization closure.

**Principle:** No breaking change without migration guide + compatibility decision.

---

## Stabilization arc (2026, Prompts 01–12)

| Prompt | Theme | Status | Evidence |
|--------|--------|--------|----------|
| 01 | Scaffold / baseline | Done | [status.md](../stabilization/status.md#prompt-01--baseline-und-scaffold-abgeschlossen) |
| 02 | HTML cache | Done | `packages/otok/docs/html-cache.md`, `.changeset/html-cache-isolation.md` |
| 03 | Action idempotency | Done | `packages/otok/docs/idempotency.md`, `.changeset/action-idempotency.md` |
| 04 | Progressive forms | Done | `packages/otok/docs/progressive-forms.md`, playground E2E |
| 05 | Hydration cleanup | Done | `packages/otok/docs/hydration-lifecycle.md` |
| 06 | Prefetch / nav | Done | `packages/otok/docs/soft-nav-prefetch.md` |
| 07 | Postgres queue + worker | Done (package) | ADR-001, `.changeset/postgres-queue-worker.md` |
| 08 | Durable workflows | Done (package) | `packages/otok-workflows/docs/durability.md` |
| 09 | Oxlint / CI split | Done | `.changeset/oxlint-oxfmt-ci.md`, `.github/workflows/ci.yml` |
| 10 | API / pack / perf gates | Done | `docs/governance/quality-gates.md`, `pnpm release:check` |
| 11 | Devjobs reference | Done (app) | `examples/devjobs-reference/` |
| 12 | RC documentation | Done | This section + [release-checklist.md](./release-checklist.md) |

**App migration for 02–06:** [migration-stabilization.md](./migration-stabilization.md).

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

## Implementation Status (1.0 audit items)

| Item | Audit-era status | After stabilization (2026) |
|------|------------------|----------------------------|
| Audit document | Done | Unchanged — [audit.md](./audit.md) |
| Gap analysis | Done | Updated (this file) |
| Governance policies | In progress | Expanded — `docs/governance/*`, quality gates |
| API stability manifest | In progress | **Enforced** — `api-stability.json`, `pnpm api:check`, snapshot |
| Plugin contract | In progress | Package exists; gate via examples + pack consumer |
| Benchmark harness | In progress | **Done** — `bench:otok`, `budget:check`, CI build job |
| `otok upgrade` | In progress | **Open** (P0-2) |
| SECURITY.md | In progress | **Open** (P0-3) |
| Migration guide (0.4→1.0) | In progress | Draft + [migration-stabilization.md](./migration-stabilization.md) |
| Release checklist / runbook | In progress | **Script-backed** — [release-checklist.md](./release-checklist.md) |
| Canary releases | Open (P1-8) | **Open** |
| Devjobs / Postgres reference | Not in audit | **Done** — `examples/devjobs-reference` |

**Blockers for marketing `1.0.0` stable:** P0 rows below still apply unless explicitly waived. **RC recommendation:** [release-candidate.md](./release-candidate.md) (`0.7.0-rc.x`, not `1.0.0`).
