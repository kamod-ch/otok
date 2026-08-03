# PreactPress → Otok migration example

Representative documentation site migrated from PreactPress patterns to **Otok + `@kamod-ch/otok-content`**.

## Features demonstrated

| Feature | Implementation |
|---------|----------------|
| Docs navigation | `@kamod-ch/preactpress-compat` `mapThemeConfig()` + `DocsLayout` |
| Markdown | `@kamod-ch/otok-content` build manifest |
| Local search | Sidebar filter (full index via compat `buildPreactPressSearchIndex`) |
| i18n | `@kamod-ch/otok-i18n` + `content/de/` |
| Sitemap / robots | `@kamod-ch/otok-seo` |
| RSS | `renderAtomFeed()` (wire in build hook) |
| Dark mode | `@kamod-ch/otok-kamod` |
| Custom theme | PreactPress-styled `DocsLayout` |
| Versioning | Version switcher + `version` frontmatter |

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## Migration docs

- [Technical migration plan](../../docs/migration/preactpress-to-otok.md)
- [otok-content migration sketch](../../packages/otok-content/docs/migration-preactpress.md)

## Benchmarks

```bash
node ../../scripts/benchmark-preactpress-migration.mjs
```

Results are written to `benchmarks/preactpress-migration/results.json`.
