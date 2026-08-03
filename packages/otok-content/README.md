# @kamod-ch/otok-content

Typed content collections for Otok — markdown, MDX, taxonomies, feeds, and build-time manifests.

## Install

```bash
pnpm add @kamod-ch/otok-content
```

## Define collections

```ts
// content.config.ts
import { defineCollection, z } from "@kamod-ch/otok-content";

const postSchema = z.object({
  title: z.string(),
  published: z.boolean().default(true),
  date: z.coerce.date(),
});

export const collections = {
  posts: defineCollection({
    source: "content/posts/**/*.{md,mdx}",
    schema: postSchema,
    sort: "date:desc",
  }),
};
```

## Plugin

```ts
import content from "@kamod-ch/otok-content/plugin";

export default defineConfig({
  plugins: [
    content({
      config: "./content.config.ts",
      origin: "https://example.com",
      gitDates: true,
    }),
  ],
});
```

## Query API (edge-safe)

```ts
import { getCollection, getEntry } from "@kamod-ch/otok-content/runtime";
import { contentManifest } from "virtual:otok-content/manifest";
import { setContentManifest } from "@kamod-ch/otok-content/runtime";

setContentManifest(contentManifest);

const posts = await getCollection("posts", ({ data }) => data.published);
const post = await getEntry("posts", params.slug);
```

## Presets

- `blogPreset` — dated posts with tags
- `docsPreset` — ordered documentation pages
- `knowledgeBasePreset` — categorized articles with references

## Docs

- [Architecture](./docs/architecture.md)
- [PreactPress migration](./docs/migration-preactpress.md)

## Examples

See `otok/examples/content-blog`, `content-docs`, and `content-knowledge-base`.
