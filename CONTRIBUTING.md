# Contributing to Otok

Thanks for helping improve Otok.

## Development Setup

```bash
pnpm install
pnpm check
pnpm test:e2e
```

Node.js 20+ and pnpm 10 are expected.

## Project Principles

- Keep Otok core small.
- Prefer Web standards and Hono concepts.
- Forms must work without client JavaScript.
- Islands are opt-in.
- Do not add UI, database, auth, validation, or CSS framework dependencies to Otok core.
- Hide unexpected server error details by default.

## Common Commands

```bash
pnpm dev              # playground dev server
pnpm check            # scaffold, lint, format, typecheck, unit tests, build
pnpm test:e2e         # Playwright playground matrix
pnpm pack:check       # package metadata, build, npm pack dry run
pnpm metadata:check   # package metadata audit only
pnpm sync:scaffold    # sync playground changes into templates
```

## Changesets

Add a changeset for user-visible package changes:

```bash
pnpm changeset
```

Docs-only or internal CI-only changes normally do not need a changeset.

## Pull Request Checklist

Before opening a PR, run:

```bash
pnpm check
pnpm test:e2e
pnpm pack:check
```

If you changed playground starter files, run:

```bash
pnpm sync:scaffold
```

## Release Process

See `docs/release.md`. Releases are handled by the GitHub Actions `Release` workflow and Changesets.
