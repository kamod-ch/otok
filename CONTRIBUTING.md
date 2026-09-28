# Contributing to Otok

Thanks for helping improve Otok.

**Otok 1.0:** See [docs/1.0/contributor-guide.md](./docs/1.0/contributor-guide.md) for API classification, RFC process, and release expectations.

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
pnpm check            # scaffold, lint, format, docs, typecheck, unit tests, build
pnpm test:e2e         # Playwright playground matrix
pnpm pack:check       # package metadata, build, npm pack dry run
pnpm metadata:check   # package metadata audit only
pnpm docs:check       # local doc links, catalog, registry, ecosystem generator, docs app
pnpm sync:scaffold    # sync playground changes into templates
```

## Documentation

When you add or rename a publishable package:

1. Add or update `packages/<name>/README.md`.
2. Add exactly one entry to `docs/ecosystem-catalog.json` (category, integration, audience, docs target).
3. For CLI-discoverable official plugins, update `packages/otok-registry/registry/v1/extensions.json` and run `pnpm --filter @kamod-ch/otok-registry registry:checksum`.
4. Regenerate docs: `pnpm docs:ecosystem:generate`.
5. Run `pnpm docs:check` before opening a PR.

The generated [ecosystem catalog](./apps/docs/content/guides/ecosystem.md) is the exhaustive package list; curated guides link from there.

## Local Kamod UI (optional)

The playground and full template depend on the published `@kamod-ui/core` package from npm. To develop against a local Kamod checkout, add a pnpm override in the workspace root:

```json
{
  "pnpm": {
    "overrides": {
      "@kamod-ui/core": "link:../kamod-ui/packages/core"
    }
  }
}
```

Do not commit a `file:` dependency for Kamod into the playground — that breaks standalone clones and CI.

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

See `docs/release.md` and [docs/1.0/release-runbook.md](./docs/1.0/release-runbook.md). Releases are handled by the GitHub Actions `Release` workflow and Changesets.

## Security

See [SECURITY.md](./SECURITY.md).
