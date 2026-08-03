# RFC Process

Significant changes to Otok core, adapters, or plugin contracts use a lightweight RFC process.

## When an RFC is required

- New Public API surface
- Breaking change to Public or adapter contract
- New adapter capability
- Plugin hook additions that affect all plugins
- Performance budget changes > 20%
- LTS policy changes

## When an RFC is optional

- Bug fixes
- Documentation
- Internal refactors
- Experimental API additions (document in PR instead)

## Format

Create `docs/rfcs/NNNN-short-title.md`:

```markdown
# RFC NNNN: Title

- **Status:** Draft | Accepted | Rejected | Superseded
- **Author:** @github-handle
- **Date:** YYYY-MM-DD

## Summary
One paragraph.

## Motivation
Why is this needed?

## Detailed design
API sketches, examples.

## Drawbacks
What could go wrong?

## Alternatives
What else was considered?

## Migration
How do existing users upgrade?

## Unresolved questions
Open items.
```

## Lifecycle

1. **Draft** — Open PR with RFC; discuss in PR comments.
2. **Accepted** — Maintainer approval + linked implementation PR.
3. **Rejected** — Document reason; close RFC PR.
4. **Superseded** — Link to replacement RFC.

## Decision

Maintainers (`@kamod-ch/otok` team) approve RFCs. No formal vote; consensus in PR review.

## Implementation

Accepted RFCs must include:

- Changeset (if user-visible)
- Tests / contract tests
- Migration guide section (if breaking)
- Update to `api-stability.json` (if API change)
