import { notFound, type OtokPageProps } from "otok/server";

const posts: Record<string, { title: string; body: string }> = {
  "hello-otok": {
    title: "Hello Otok",
    body: "Otok content sites combine SSR, file-based routing, and optional islands.",
  },
  "progressive-forms": {
    title: "Progressive forms",
    body: "Start with native HTML forms and enhance with client mutations when ready.",
  },
};

export const loader = ({ params }: { params: { slug: string } }) => {
  const post = posts[params.slug];
  if (!post) notFound();
  return { post, slug: params.slug };
};

export const head = ({ data }: OtokPageProps<Awaited<ReturnType<typeof loader>>>) => ({
  title: `${data.post.title} | Otok Content`,
});

export default function BlogPost({ data }: OtokPageProps<Awaited<ReturnType<typeof loader>>>) {
  return (
    <article class="mx-auto max-w-2xl space-y-4 py-8">
      <a href="/" class="text-sm text-sky-700 hover:underline">
        ← Back
      </a>
      <h1 class="text-3xl font-semibold">{data.post.title}</h1>
      <p class="text-slate-700 dark:text-slate-200">{data.post.body}</p>
    </article>
  );
}
