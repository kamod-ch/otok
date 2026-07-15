# PreactPress configuration note

This app is structured as an `apps/docs` static documentation site with markdown content, search index, sitemap, robots.txt, responsive navigation, dark-mode aware CSS, and GitHub Pages deployment.

The intended PreactPress package is `@kamod-ch/preactpress`. The current repository keeps the docs build dependency-free so `pnpm check` remains reproducible in this workspace; when the package is added to the lockfile, the content under `content/` can be consumed by PreactPress directly.
