import { z, defineCollection } from "../core/define-collection.js";

export const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  draft: z.boolean().optional(),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
});

export const postsCollection = defineCollection({
  source: "posts/**/*.{md,mdx}",
  schema: postSchema,
  sort: "date:desc",
  cacheTag: "content:posts",
});

export const blogPreset = {
  posts: postsCollection,
};
