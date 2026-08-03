import { z, defineCollection } from "../core/define-collection.js";

export const docSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  draft: z.boolean().optional(),
  sidebar: z.boolean().default(true),
});

export const docsCollection = defineCollection({
  source: "docs/**/*.{md,mdx}",
  schema: docSchema,
  sort: "order:asc",
  cacheTag: "content:docs",
});

export const docsPreset = {
  docs: docsCollection,
};
