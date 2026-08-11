# Release Runbook

Step-by-step release procedure for Otok maintainers.

## Normal release (stable)

### 1. Pre-flight

```bash
git checkout main
git pull
pnpm release:check
pnpm api:check
pnpm budget:check
```

Complete [release-checklist.md](./release-checklist.md).

### 2. Changesets

Contributors add changesets in feature PRs. Before release, ensure all intended changes have changesets:

```bash
pnpm changeset status
```

### 3. Version PR

Push to `main`. GitHub Actions `Release` workflow opens/updates **Version Packages** PR.

Review the PR:

- Version bumps correct
- Changelogs accurate
- No accidental major bumps

Merge the Version PR.

### 4. Publish

Same workflow publishes to npm after merge:

- `npm_config_provenance=true`
- GitHub releases created

### 5. Post-publish

- Verify npm package versions
- Deploy docs (`Deploy` workflow on main)
- Announce if major/minor

## Canary release

Manual workflow: `.github/workflows/canary.yml`

```bash
# Trigger via GitHub Actions UI: workflow_dispatch
# Or locally (maintainers only):
pnpm changeset pre enter canary
pnpm version-packages
pnpm release:publish --tag canary
pnpm changeset pre exit
```

Install canary:

```bash
pnpm add otok@canary
```

## Hotfix (security)

1. Branch from release tag: `git checkout -b hotfix/1.0.1 v1.0.0`
2. Fix + changeset (patch)
3. Fast-track review
4. Publish patch
5. Cherry-pick to `main`
6. GitHub Security Advisory if CVE

## Rollback

npm packages cannot be unpublished after 72h. Publish a forward-fix patch instead.

If bad release:

1. Publish fixed patch version
2. Mark bad version deprecated on npm (`npm deprecate otok@1.0.1 "Use 1.0.2"`)
3. Update GitHub release notes

## Changelog automation

Changesets generates per-package CHANGELOG.md. Root changelog aggregates manually in release notes.

Custom changelog config: `.changeset/config.json`.

## Linked packages

These version together:

- `otok`
- `@kamod-ch/otok-vite-plugin`
- `create-otok`

Single changeset can target the group.

## Failure recovery

| Failure | Action |
|---------|--------|
| Publish partial success | Rerun workflow; Changesets skips published versions |
| Version PR wrong | Close PR, fix changesets on main, re-run |
| CI red on main | Block release until green |

## Contacts

- npm org admins: `@kamod-ch` maintainers
- Security: security@kamod.ch
