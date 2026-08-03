# PreactPress → otok-content migration

This document sketches how PreactPress can adopt `@kamod-ch/otok-content` without merging the codebases.

## Goals

- Reuse collection validation, reference resolution, and manifest generation
- Keep PreactPress-specific rendering (layouts, theme, VitePress-style nav) in PreactPress
- Avoid a runtime dependency from otok-content → PreactPress

## Phase 1: Shared core extraction (optional)

Move framework-agnostic logic to `@kamod-ch/content-core` (future):

- `defineCollection`, Zod validation, slug/id helpers
- Reference resolution (`@ref:` marker)
- Incremental fingerprint tracking

`@kamod-ch/otok-content` and PreactPress both depend on `content-core`.

**Current state:** logic lives in `otok-content/src/core/` and can be extracted when PreactPress migrates.

## Phase 2: Adapter in PreactPress

Replace `preactpress/src/node/collections/loadEntries.ts` internals:

```ts
// preactpress/src/node/collections/otok-bridge.ts
import { buildContentManifest, createRegistry } from "@kamod-ch/otok-content";
import type { CollectionDefinition as OtokDef } from "@kamod-ch/otok-content";

function toOtokDefinition(def: PreactpressCollectionDefinition): OtokDef {
  return {
    __kind: "otok-collection",
    source: def.patterns ?? [`${def.directory}/**/*.{md,mdx}`],
    schema: def.schema,
    includeDrafts: def.includeDrafts,
    sort: mapSort(def.sort),
    references: def.references,
  };
}
```

Map PreactPress `CollectionEntry` from `ContentEntry`:

| PreactPress | otok-content |
|-------------|--------------|
| `entry.id` | `entry.id` |
| `entry.route` | `entry.route` |
| `entry.url` | `publicUrl(site.base, entry.route)` |
| `entry.data` | `entry.data` |

## Phase 3: Markdown pipeline

PreactPress `markdown.ts` adds Shiki, containers, includes. Options:

1. **Keep PreactPress markdown** for HTML generation; use otok-content only for collection loading
2. **Plugin hooks** — otok-content exposes `renderContent` hook; PreactPress registers Shiki transformer

Recommended: (2) with a `ContentRenderer` interface:

```ts
interface ContentRenderer {
  render(file: string, body: string): Promise<{ html: string; toc: TocItem[] }>;
}
```

PreactPress passes its existing `renderMarkdown()` implementation.

## Phase 4: Otok apps using PreactPress content

For greenfield Otok sites:

1. Install `@kamod-ch/otok-content`
2. Port `content/` directory and Zod schemas from PreactPress site config
3. Replace `runCollectionLoader` calls with `getCollection` / `getEntry` in route loaders
4. Wire sitemap via `contentEntriesToSitemapUrls` + `@kamod-ch/otok-seo`

## Phase 5: Deprecation path

Once parity is verified:

- Mark `preactpress/src/node/collections/*` as thin wrappers
- Redirect `defineCollection` docs to otok-content
- Keep PreactPress-specific presets (VitePress theme, sidebar) in PreactPress

## Testing strategy

- Run PreactPress collection tests against otok-content manifest output
- Snapshot compare `CollectionEntry[]` vs mapped `ContentEntry[]`
- Verify reference errors, duplicate slugs, draft filtering behave identically

## Rollback

PreactPress keeps its existing loader until feature parity is confirmed. The adapter is additive — no big-bang switch required.
