import type { Post } from "../data/posts";

export function PostCard({ post, admin = false }: { post: Post; admin?: boolean }) {
  return (
    <article class="post-card">
      <p class={`status ${post.status}`}>{post.status}</p>
      <h2><a href={admin ? `/admin/posts/${post.slug}` : `/posts/${post.slug}`}>{post.title}</a></h2>
      <p>{post.excerpt}</p>
      <small>Updated {new Date(post.updatedAt).toLocaleString()}</small>
    </article>
  );
}
