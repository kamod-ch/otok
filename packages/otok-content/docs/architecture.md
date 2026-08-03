# otok-content architecture

`@kamod-ch/otok-content` is the official Otok extension for typed content applications. It follows a **decoupled two-layer design** so PreactPress and other frameworks can share the same core without tight coupling.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  App routes (loaders)                                   │
│  getCollection / getEntry from @kamod-ch/otok-content   │
└───────────────────────────┬─────────────────────────────┘
                            │ edge-safe runtime
┌───────────────────────────▼─────────────────────────────┐
│  virtual:otok-content/manifest (serialized JSON)          │
└───────────────────────────┬─────────────────────────────┘
                            │ build-time only
┌───────────────────────────▼─────────────────────────────┐
│  Otok plugin (buildStart)                               │
│  scan → validate → render markdown → write manifest     │
└─────────────────────────────────────────────────────────┘
```

### Build-time (`src/core/`, `src/plugin.ts`)

- Node APIs allowed: filesystem, git, glob, markdown compilation
- Scans local globs and optional remote sources
- Validates frontmatter with Zod (Standard Schema compatible)
- Resolves cross-collection references
- Renders markdown/MDX to HTML at build time (no runtime MDX execution)
- Writes incremental fingerprint state (`.otok-content-state.json`)
- Exposes manifest via `virtual:otok-content/manifest`

### Runtime (`src/runtime/`)

- **No Node APIs** — safe for Edge bundles
- Reads pre-serialized manifest only
- Query API: `getCollection`, `getEntry`
- Pagination, taxonomies, search helpers operate on manifest data

### Integration points (loose coupling)

| Feature | Integration |
|---------|-------------|
| SEO / sitemap | Export `contentEntriesToSitemapUrls()` — merge in `@kamod-ch/otok-seo` loader |
| i18n | Locale prefix in paths; filter by `entry.locale` |
| Cache | Per-collection `cacheTag`; use with Otok revalidation |
| Feeds | `renderRssFeed` / `renderAtomFeed` in route loaders |

## Content collections

```ts
const posts = defineCollection({
  source: "content/posts/**/*.{md,mdx}",
  schema: postSchema,
  sort: "date:desc",
  references: { author: "authors" },
  computed: {
    readingTime: (entry) => estimateReadingTime(entry.html),
  },
});
```

## Live vs build-time collections

- **Build-time (default):** manifest rebuilt on `buildStart`; fastest runtime
- **Live (dev):** plugin watches content root and rebuilds manifest on change (`live: true`)

## Security

MDX is compiled during build only. The runtime manifest contains pre-rendered HTML — no `eval` or unchecked MDX execution in Edge bundles.

## PreactPress alignment

The core APIs mirror PreactPress `defineCollection` / `loadCollectionEntries` but use Otok conventions:

| PreactPress | otok-content |
|-------------|--------------|
| `directory` | `source` glob |
| `CollectionEntry.url` | `ContentEntry.route` + app origin |
| `__kind: "collection"` | `__kind: "otok-collection"` |

See [migration-preactpress.md](./migration-preactpress.md).
