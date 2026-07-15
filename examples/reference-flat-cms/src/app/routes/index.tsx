import type { OtokPageProps } from "otok/server";
import { PostCard } from "../components/post-card";
import { posts, type Post } from "../data/posts";

export const head = () => ({ title: "Flat CMS" });

export const loader = () => ({ posts: posts.list() });

export default function Index({ data }: OtokPageProps<{ posts: Post[] }>) {
  return (
    <>
      <section class="hero">
        <p class="eyebrow">Reference project</p>
        <h1>A flat-file content workflow built with Otok.</h1>
        <p>Public pages render without client JavaScript. Editing screens opt into islands only for live preview.</p>
      </section>
      <section class="post-grid">
        {data.posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </section>
    </>
  );
}
