# Release Flow

1. Add a changeset for user-visible package changes with `pnpm changeset`.
2. Run `pnpm check` and `pnpm run pack:check`.
3. Version packages with `pnpm run version-packages` when preparing a release PR.
4. Publish with `pnpm run release` only from a clean working tree and with maintainer approval.

`pack:check` builds every publishable package and runs `npm pack --dry-run` so missing templates or compiled test artifacts are caught before publishing.
