import { notFound, type OtokPageProps } from "otok/server";
import { posts, type Post } from "../../data/posts";

export const loader = ({ params }: { params: Record<string, string> }) => {
  const post = posts.get(params.slug);
  if (!post) notFound();
  return { post };
};

export const head = ({ data }: { data: { post: Post } }) => ({
  title: data.post.title,
  meta: [{ name: "description", content: data.post.excerpt }],
});

export default function PostPage({ data }: OtokPageProps<{ post: Post }>) {
  return (
    <article class="card post">
      <p class={`status ${data.post.status}`}>{data.post.status}</p>
      <h1>{data.post.title}</h1>
      <p class="excerpt">{data.post.excerpt}</p>
      <p>{data.post.body}</p>
    </article>
  );
}
