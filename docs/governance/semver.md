# SemVer Rules

Otok follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version format

`MAJOR.MINOR.PATCH`

## What triggers a bump

| Bump | Examples |
|------|----------|
| **PATCH** | Bug fixes, security patches, docs for existing APIs, perf improvements without API change |
| **MINOR** | New public APIs, new route capabilities, new plugin hooks (backward compatible), Experimental promotions |
| **MAJOR** | Removed exports, changed function signatures, incompatible config schema, adapter contract breaks |

## Linked packages

These version together via Changesets (`linked` group):

- `otok`
- `@kamod-ch/otok-vite-plugin`
- `create-otok`

Other packages (`@kamod-ch/otok-test`, `@kamod-ch/*`, adapters) version independently unless explicitly grouped in a changeset.

## Pre-release tags

| Tag | Use |
|-----|-----|
| `-alpha.N` | Internal testing, API unstable |
| `-beta.N` | Feature complete, migration guide draft |
| `-rc.N` | Release candidate, no known blockers |

Canary publishes use `canary` dist-tag (see [release-runbook.md](../1.0/release-runbook.md)).

## Ecosystem plugins

Plugin packages may be at different major versions (e.g. `@kamod-ch/otok-i18n@3.0.0`). Compatibility is expressed via:

1. Registry entry `otokVersion` range
2. [Compatibility matrix](./compatibility-matrix.md)
3. `otok doctor` / `otok upgrade` checks

## 0.x policy (until 1.0.0)

While core is `0.x`, minor releases may include breaking changes with migration notes. After `1.0.0`, full SemVer applies to Public APIs.

## Deprecation

See [deprecation-policy.md](./deprecation-policy.md). Deprecated Public APIs remain for at least one minor release before removal in the next major.
