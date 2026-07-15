export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  updatedAt: string;
}

const state = new Map<string, Post>();

const seed: Post[] = [
  {
    slug: "welcome-to-flat-cms",
    title: "Welcome to Flat CMS",
    excerpt: "A content workflow built with Otok loaders, actions, middleware, and islands.",
    body: "Flat CMS stores posts as plain records in memory for the reference app. Swap this module for markdown files, object storage, or Git-backed content.",
    status: "published",
    updatedAt: "2026-07-15T10:00:00.000Z",
  },
  {
    slug: "draft-launch-plan",
    title: "Draft launch plan",
    excerpt: "Draft content is hidden from the public index but visible in the admin area.",
    body: "Use route middleware to protect editing screens and actions. This reference uses an admin header to keep setup dependency-free.",
    status: "draft",
    updatedAt: "2026-07-15T10:30:00.000Z",
  },
];

for (const post of seed) state.set(post.slug, post);

export function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const posts = {
  list(options: { includeDrafts?: boolean } = {}) {
    return [...state.values()]
      .filter((post) => options.includeDrafts || post.status === "published")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  get(slug: string, options: { includeDrafts?: boolean } = {}) {
    const post = state.get(slug);
    if (!post) return undefined;
    if (post.status === "draft" && !options.includeDrafts) return undefined;
    return post;
  },
  save(input: { originalSlug?: string; title: string; excerpt: string; body: string; status: Post["status"] }) {
    const slug = slugify(input.title);
    if (!slug) throw new Error("Title must produce a slug.");
    if (input.originalSlug && input.originalSlug !== slug) state.delete(input.originalSlug);
    const post: Post = {
      slug,
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    state.set(slug, post);
    return post;
  },
  delete(slug: string) {
    return state.delete(slug);
  },
};
