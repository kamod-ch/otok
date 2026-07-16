# Release Flow

Otok uses Changesets for package versioning, npm publishing, changelog updates, and GitHub releases.

## Release Scope

Publishable packages live under `packages/`:

- `otok`
- `@otok/vite-plugin`
- `create-otok`
- `@otok/test`
- `@kamod-ch/otok-auth`
- `@kamod-ch/otok-validate`
- `@kamod-ch/otok-flash`

Apps, docs, examples, and templates are not published directly, but they are validated before releases.

## For Contributors

1. Add a changeset for every user-visible package change:

   ```bash
   pnpm changeset
   ```

2. Run the local release checks before asking for review:

   ```bash
   pnpm release:check
   ```

3. Commit code, tests, docs, and the generated `.changeset/*.md` file.

Docs-only changes that do not affect published packages do not need a changeset.

## For Maintainers

The `Release` GitHub Actions workflow runs on pushes to `main`.

If unpublished changesets exist, the workflow opens or updates a version PR with:

- package version bumps
- package changelogs
- consumed changeset files

After the version PR is merged, the same workflow publishes packages to npm and creates GitHub releases via `changesets/action`.

Required repository secrets:

- `NPM_TOKEN` with publish access for the `otok`, `@otok/*`, `@kamod-ch/*`, and `create-otok` packages
- the default `GITHUB_TOKEN` is used for version PRs and GitHub releases

The workflow enables npm provenance with `npm_config_provenance=true`, so packages are published from GitHub Actions with supply-chain metadata.

## Manual Release Checklist

Use this checklist before manually running `pnpm release` or triggering the workflow:

```bash
pnpm check
pnpm test:e2e
pnpm pack:check
```

Then publish from a clean working tree:

```bash
pnpm release:publish
```

Prefer the GitHub workflow for normal releases.

## Package Metadata Audit

`pnpm metadata:check` verifies that every publishable package has:

- license
- description
- homepage
- bugs URL
- repository URL and package directory
- files allowlist
- Node engine
- public publish config
- exports or bin entry

`pnpm pack:check` runs the metadata audit before building and dry-packing each package.

## Versioning Policy

- Patch: bug fixes, documentation for package APIs, build metadata, testing utilities, and backward-compatible hardening.
- Minor: new APIs, new route/runtime capabilities, and backward-compatible framework features.
- Major: breaking API changes, removed exports, changed runtime assumptions, or incompatible template changes.

Packages `otok`, `@otok/vite-plugin`, and `create-otok` are linked in Changesets and version together. `@otok/test` may version independently unless a changeset selects it with other packages.

## Publishing Failures

If npm publish succeeds but GitHub release creation fails, rerun the workflow after confirming npm package versions. Changesets will skip already-published packages.

If a version PR is incorrect, close it, adjust changesets or package metadata on `main`, and let the workflow recreate the PR.
