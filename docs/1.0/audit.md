# Otok 1.0 Readiness Audit

**Date:** 2026-08-03
**Scope:** Full monorepo audit before Otok 1.0
**Current core version:** 0.4.0

---

## Executive Summary

Otok has strong foundations: CI/release automation (Changesets), adapter contract tests, a documentation site, Playwright e2e, extension registry, and `otok doctor`. Gaps for 1.0 center on **version alignment**, **formal API stability**, **plugin contract package**, **benchmark regression gates**, **upgrade tooling**, **SECURITY.md**, and **test coverage for presets/kits**.

No breaking changes should ship without a migration guide and compatibility decision (see [gap-analysis.md](./gap-analysis.md)).

---

## 1. Public API

### Core exports (`otok` package)

| Subpath | Stability (target) | Notes |
|---------|-------------------|-------|
| `.` / `./config` | Public | Re-exports `@kamod-ch/otok-config` |
| `./server` | Public | `createOtokApp`, handlers, streaming |
| `./client` | Public | Islands, hydration, soft-nav |
| `./shared` | Public | Route types, theme, deferred |
| `./route` | Public | Loaders, actions, meta |
| `./rendering` | Public | Render plans, deferred boundaries |
| `./cache` | Public | Cache providers |
| `./client/mutations` | Public | Optimistic mutations |
| `./devtools` | Experimental | Dev-only diagnostics |

Machine-readable manifest: [`api-stability.json`](../../api-stability.json).

**Gaps:** No enforced export allowlist in CI; `./devtools` needs explicit Experimental marking in docs; internal `__options` on plugins undocumented for consumers.

---

## 2. Internal APIs

| Area | Location | Risk |
|------|----------|------|
| Plugin `__options` marker | `@kamod-ch/otok-config` types | Internal — must not be used by plugins |
| Vite plugin internals | `@kamod-ch/otok-vite-plugin` | Internal |
| Route typegen AST | `@kamod-ch/otok-route-typegen` | Internal |
| Registry checksum scripts | `@kamod-ch/otok-registry/scripts` | Internal |
| Scaffold sync | `scripts/sync-scaffold.mjs` | Internal |

**Recommendation:** Document all Internal surfaces in `docs/governance/api-classification.md` and block new imports of Internal paths from examples.

---

## 3. Packages (45 total)

| Category | Count | Version range | Test coverage |
|----------|-------|---------------|---------------|
| Core runtime | 4 | 0.2–0.4 | Strong |
| Adapters | 4 | 0.1–1.0 | Contract tests |
| Ecosystem plugins | 15 | 0.1–3.0 | Strong (most) |
| Presets | 5 | 0.1.0 | **None** |
| Kits | 5 | 0.1.0 | Partial (2 untested) |
| Tooling | 6 | 0.1–0.5 | Strong |
| Fixtures | 2 | 1.0.0 | Yes |

**Version skew:** Core `otok@0.4.0` vs ecosystem `@kamod-ch/otok-i18n@3.0.0`. For Otok 1.0, align semver story: core 1.0.0 does not require all plugins at 1.0, but `otokVersion` ranges in registry must be updated.

---

## 4. Plugins

- Contract defined in `@kamod-ch/otok-config` (`OtokPlugin` interface, ADR 0006)
- Fixture coverage: `@kamod-ch/otok-plugin-fixture`, `@kamod-ch/otok-plugin-hello`
- **Gap:** No standalone `@kamod-ch/otok-plugin-contract` package (adapter-contract pattern exists)

---

## 5. Adapters

| Adapter | Version | Contract test |
|---------|---------|---------------|
| `otok-adapter-node` | 1.0.0 | Yes |
| `otok-adapter-cloudflare` | 1.0.0 | Yes |
| `otok-adapter-static` | 1.0.0 | Yes |

Adapter contract package: `otok-adapter-contract@0.1.1`. **Status: adequate for 1.0** with budget checks added.

---

## 6. CLI (`otok-cli@0.1.1`)

| Command | Status |
|---------|--------|
| `add` | Registry compat checks |
| `search`, `info`, `outdated` | Registry integration |
| `doctor` | Broad diagnostics, `--fix` |
| `typegen`, `routes`, `db:*` | Present |
| **`upgrade`** | **Missing — P0 for 1.0** |

---

## 7. Generated Types

- Route types via `@kamod-ch/otok-route-typegen` → `.otok/types/routes.d.ts`
- `otok doctor` warns when missing
- **Gap:** No CI check that playground generates clean typegen output

---

## 8. Documentation

| Asset | Status |
|-------|--------|
| Docs site (`apps/docs`) | 35 pages |
| ADRs (0001–0007) | Present |
| `docs/conventions.md` | Present |
| `docs/release.md` | Present |
| Registry user/publisher docs | Present |
| **1.0 governance docs** | **This initiative** |
| **SECURITY.md** | **Missing** |
| **Migration guide 0.x→1.0** | **This initiative** |

---

## 9. Examples

14 examples with `package.json`; validated via `pnpm check:examples`.
Benchmark example exists but is ad-hoc (`examples/rendering-benchmark`).

**Gap:** No cross-framework minimal benchmark suite.

---

## 10. Test Coverage

| Metric | Value |
|--------|-------|
| Packages with tests | 37/45 |
| Without tests | 8 (presets + 2 kits) |
| E2E | Playwright on playground |
| Contract tests | Adapters yes, plugins partial |

---

## 11. Performance

- Ad-hoc SSR latency bench in `examples/rendering-benchmark`
- No CI regression gates
- No bundle-size budgets enforced

**Gap:** Reproducible benchmark harness with budgets (see `benchmarks/`).

---

## 12. Security

- `@kamod-ch/otok-security` middleware package
- Registry `securityNotes` field
- Auth ADR and architecture doc
- **Missing:** Root `SECURITY.md`, responsible disclosure process, dependency audit automation

---

## 13. Version Compatibility

- Changesets linked: `otok`, `@kamod-ch/otok-vite-plugin`, `create-otok`
- Registry `otokVersion` ranges per extension
- Kit merge version checks in `@kamod-ch/otok-config`
- **Gap:** Published compatibility matrix document; LTS policy

---

## Audit Conclusion

**Ready for 1.0 foundation work.** Blockers before tagging `1.0.0`:

1. API stability manifest + CI enforcement
2. `otok upgrade` command
3. SECURITY.md + disclosure process
4. Migration guide from 0.4.x
5. Benchmark harness with Otok self-baselines
6. Plugin contract package
7. Preset/kit smoke tests (minimal)

See [gap-analysis.md](./gap-analysis.md) for prioritized work items.
