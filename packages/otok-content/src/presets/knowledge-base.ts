import { z, defineCollection } from "../core/define-collection.js";
import { reference } from "../core/reference.js";

export const articleSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  related: z.array(reference("articles")).default([]),
  draft: z.boolean().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const articlesCollection = defineCollection({
  source: "kb/**/*.{md,mdx}",
  schema: articleSchema,
  sort: "slug:asc",
  references: { related: "articles" },
  cacheTag: "content:kb",
});

export const knowledgeBasePreset = {
  articles: articlesCollection,
};
