import { defineCollection, z } from "@kamod-ch/otok-content";

export const docSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  draft: z.boolean().optional(),
  version: z.enum(["v1", "v2"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const collections = {
  docs: defineCollection({
    source: ["docs/**/*.{md,mdx}", "de/docs/**/*.{md,mdx}"],
    schema: docSchema,
    sort: "order:asc",
    cacheTag: "content:docs",
  }),
};
