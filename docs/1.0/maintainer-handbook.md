# Maintainer Handbook

For Otok core maintainers — release, security, and quality responsibilities.

## Daily operations

- Triage GitHub issues and PRs
- Run `pnpm check` on significant PRs
- Require changesets for user-visible package changes

## Release authority

Releases flow through GitHub Actions + Changesets (see [release-runbook.md](./release-runbook.md)).

Maintainers with npm publish access:

- Must use MFA on npm
- Prefer workflow publish over local `npm publish`

## Version decisions

Follow [semver rules](../governance/semver.md):

- Patch: maintainer discretion
- Minor: PR review + changeset
- Major: RFC + migration guide + compatibility decision log

## Security

- Monitor security@kamod.ch
- Triage GitHub Security Advisories within 48h
- Follow [SECURITY.md](../../SECURITY.md)

## API stability

- Update `api-stability.json` when adding exports
- Run `pnpm api:check` before merge
- Never remove Public API without deprecation cycle

## Registry

Extension PRs to `@otok/registry`:

1. Verify publisher ownership
2. Regenerate checksum (`pnpm --filter @otok/registry registry:checksum`)
3. Check `otokVersion` accuracy

## Benchmarks

- Review `pnpm budget:check` on perf-sensitive PRs
- Update budgets only via RFC if > 5% change

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Development, Changesets version PRs |
| `v0.4.x` | Security fixes post-1.0 (if needed) |
| `v1.0.x` | LTS backports (future) |

## On-call (informal)

No formal rotation. First available maintainer responds to security reports and release blockers.

## Contacts

- Security: security@kamod.ch
- Registry abuse: see registry `index.json` `abuseContact`
