# Blog example

Typed blog collection using `@kamod-ch/otok-content`.

```ts
import { defineCollection, z } from "@kamod-ch/otok-content";

export const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const collections = {
  posts: defineCollection({
    source: "content/posts/**/*.{md,mdx}",
    schema: postSchema,
    sort: "date:desc",
  }),
};
```

```ts
import { getCollection, getEntry } from "@kamod-ch/otok-content/runtime";

export const loader = async () => {
  const posts = await getCollection("posts", ({ data }) => data.published);
  return { posts };
};

export const loader = async ({ params }) => {
  const post = await getEntry("posts", params.slug);
  if (!post) throw new Response(null, { status: 404 });
  return { post };
};
```

See `content/` for sample markdown posts.
