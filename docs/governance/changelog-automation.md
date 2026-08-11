# Changelog automation

Otok uses [Changesets](https://github.com/changesets/changesets) for automated changelog generation.

## Contributor workflow

```bash
pnpm changeset
```

Select affected packages and bump type (patch/minor/major). Commit the generated `.changeset/*.md` file with your PR.

## Generated output

- Per-package `CHANGELOG.md` updated on version PR merge
- GitHub releases created by `changesets/action`

## Configuration

- `.changeset/config.json` — linked packages, access, changelog generator
- Linked group: `otok`, `@kamod-ch/otok-vite-plugin`, `create-otok`

## Release notes

Maintainers copy significant entries from package changelogs into GitHub release descriptions. For 1.0, link [migration guide](../1.0/migration-guide-0.4-to-1.0.md).

## Canary changelogs

Canary publishes (`canary` dist-tag) use the same changeset flow with `changeset pre enter canary`.

See [release-runbook.md](../1.0/release-runbook.md).
