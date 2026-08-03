# Compatibility Decisions Log

Record breaking changes and compatibility exceptions per [deprecation-policy.md](../governance/deprecation-policy.md).

## Template

```markdown
### YYYY-MM-DD — Title

- **Decision:** Accept / Defer / Reject breaking change
- **Affected:** packages/APIs
- **Rationale:**
- **Migration:**
- **Approver:**
```

## Decisions

### 2026-08-03 — Otok 1.0 Public API freeze

- **Decision:** No breaking Public API changes in 1.0.0 vs 0.4.x
- **Affected:** `otok` Public exports
- **Rationale:** 1.0 stability guarantee; Experimental surfaces (kits/presets) exempt
- **Migration:** [migration-guide-0.4-to-1.0.md](./migration-guide-0.4-to-1.0.md)
- **Approver:** Maintainers

### 2026-08-03 — Independent plugin semver

- **Decision:** `@kamod-ch/*` plugins keep independent majors; registry `otokVersion` is compat source
- **Affected:** All ecosystem plugins
- **Rationale:** Plugins already at 1.0–3.0; forcing unified major would break npm consumers
- **Migration:** Use `otok upgrade` and `otok doctor`
- **Approver:** Maintainers
