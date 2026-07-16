import { notFound, type OtokPageProps } from "otok/server";
import { posts, type Post } from "../../data/posts";

export const loader = ({ params }: { params: Record<string, string> }) => {
  const post = posts.get(params.slug);
  if (!post) notFound();
  return { post: post as unknown as Record<string, unknown> };
};

export const head = ({ data }: { data: { post: Post } }) => ({
  title: data.post.title,
  description: data.post.excerpt,
});

export default function PostPage({ data }: OtokPageProps) {
  const post = (data as unknown as { post: Post }).post;
  return (
    <article class="card post">
      <p class={`status ${post.status}`}>{post.status}</p>
      <h1>{post.title}</h1>
      <p class="excerpt">{post.excerpt}</p>
      <p>{post.body}</p>
    </article>
  );
}
