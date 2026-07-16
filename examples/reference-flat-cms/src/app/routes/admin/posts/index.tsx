import type { OtokContext, OtokPageProps } from "otok/server";
import { PostCard } from "../../../components/post-card";
import { posts, type Post } from "../../../data/posts";

export const head = () => ({ title: "CMS Admin" });

export const loader = ({ hono }: OtokContext) => ({
  admin: (hono as { get: (key: string) => unknown }).get("admin") as { name: string },
  posts: posts.list({ includeDrafts: true }),
});

export default function AdminPosts({ data }: OtokPageProps) {
  const page = data as unknown as { admin: { name: string }; posts: Post[] };
  return (
    <>
      <section class="hero compact">
        <p class="eyebrow">Admin</p>
        <h1>Welcome, {page.admin.name}</h1>
        <p>Draft and published posts are visible here. The public index only shows published content.</p>
        <a class="button" href="/admin/posts/new">Create post</a>
      </section>
      <section class="post-grid">
        {page.posts.map((post) => <PostCard key={post.slug} post={post} admin />)}
      </section>
    </>
  );
}
