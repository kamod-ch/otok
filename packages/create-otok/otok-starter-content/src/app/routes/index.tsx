import type { OtokPageProps } from "otok/server";

export const loader = () => ({
  posts: [
    { slug: "hello-otok", title: "Hello Otok", excerpt: "Ship content sites with SSR and islands." },
    { slug: "progressive-forms", title: "Progressive forms", excerpt: "HTML-first mutations with optional client enhancement." },
  ],
});

export const head = () => ({
  title: "Blog | Otok Content",
  description: "A minimal content website starter.",
});

export default function BlogIndex({ data }: OtokPageProps<Awaited<ReturnType<typeof loader>>>) {
  return (
    <section class="mx-auto max-w-2xl space-y-6 py-8">
      <h1 class="text-3xl font-semibold">Blog</h1>
      <ul class="space-y-4">
        {data.posts.map((post) => (
          <li key={post.slug} class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <a href={`/blog/${post.slug}`} class="text-lg font-medium text-sky-700 hover:underline">
              {post.title}
            </a>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
