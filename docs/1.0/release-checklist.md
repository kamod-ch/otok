# Otok 1.0 Release Checklist

Use before tagging `v1.0.0` or publishing RC builds.

## Code quality

- [ ] `pnpm check` passes
- [ ] `pnpm test:e2e` passes
- [ ] `pnpm pack:check` passes
- [ ] `pnpm api:check` passes
- [ ] `pnpm budget:check` passes (or documented waiver with RFC)
- [ ] No open P0 items in [gap-analysis.md](./gap-analysis.md)

## Documentation

- [ ] [migration-guide-0.4-to-1.0.md](./migration-guide-0.4-to-1.0.md) reviewed
- [ ] [api-stability-report.md](./api-stability-report.md) published
- [ ] [support-matrix.md](./support-matrix.md) current
- [ ] CHANGELOG updated via Changesets
- [ ] Docs site built and deployed

## Security

- [ ] SECURITY.md in place
- [ ] No known unpatched CVEs in dependencies (`pnpm audit`)
- [ ] npm provenance enabled in publish workflow

## Compatibility

- [ ] Adapter contract tests pass (all three adapters)
- [ ] Plugin contract tests pass
- [ ] Registry `otokVersion` ranges updated for 1.0
- [ ] `otok doctor` clean on playground + minimal starter

## Release artifacts

- [ ] Changesets version PR merged
- [ ] GitHub release notes drafted
- [ ] Canary tested (`canary` dist-tag) if applicable
- [ ] `create-otok` scaffolds pinned to 1.0 versions

## Communication

- [ ] Blog/release announcement draft
- [ ] Migration guide linked in release notes
- [ ] Registry index checksum regenerated

## Post-release

- [ ] Monitor npm download errors / GitHub issues
- [ ] 0.4.x maintenance branch tagged if needed
- [ ] Update gap-analysis implementation status

## Sign-off

| Role | Name | Date |
|------|------|------|
| Maintainer | | |
| Security review | | |
