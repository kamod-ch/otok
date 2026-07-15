import { Island } from "otok/client";
import { fail, notFound, redirect, type OtokActionContext, type OtokPageProps } from "otok/server";
import { posts, type Post } from "../../../data/posts";
import LivePreview from "../../../islands/live-preview";

interface PageData { post: Post }
interface FormFailure { message: string; fieldErrors?: Record<string, string[]>; values?: Partial<Post> }

export const loader = ({ params }: { params: Record<string, string> }) => {
  const post = posts.get(params.slug, { includeDrafts: true });
  if (!post) notFound();
  return { post };
};

export async function action({ formData, params, method }: OtokActionContext) {
  if (method === "DELETE") {
    posts.delete(params.slug);
    redirect("/admin/posts", 303);
  }

  const title = String(formData?.get("title") ?? "").trim();
  const excerpt = String(formData?.get("excerpt") ?? "").trim();
  const body = String(formData?.get("body") ?? "").trim();
  const status = formData?.get("status") === "published" ? "published" : "draft";
  const fieldErrors: Record<string, string[]> = {};
  if (!title) fieldErrors.title = ["Title is required."];
  if (!excerpt) fieldErrors.excerpt = ["Excerpt is required."];
  if (!body) fieldErrors.body = ["Body is required."];

  if (Object.keys(fieldErrors).length > 0) {
    fail(400, { message: "Validation failed", fieldErrors, values: { title, excerpt, body, status } });
  }

  const post = posts.save({ originalSlug: params.slug, title, excerpt, body, status: status as Post["status"] });
  redirect(`/admin/posts/${post.slug}`, 303);
}

export default function EditPost({ data, actionData }: OtokPageProps<PageData, FormFailure>) {
  const values = { ...data.post, ...actionData?.values };
  return (
    <section class="editor-layout">
      <form method="post" class="card editor-form">
        <h1>Edit post</h1>
        <label>Title<input name="title" value={values.title} aria-invalid={Boolean(actionData?.fieldErrors?.title)} /></label>
        <label>Excerpt<input name="excerpt" value={values.excerpt} /></label>
        <label>Body<textarea name="body" rows={8}>{values.body}</textarea></label>
        <label>Status<select name="status" value={values.status}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <button class="button">Save changes</button>
      </form>
      <form method="post" class="card danger">
        <input type="hidden" name="_method" value="DELETE" />
        <h2>Danger zone</h2>
        <button class="button danger-button">Delete post</button>
      </form>
      <Island component={LivePreview} props={{ initialTitle: values.title, initialBody: values.body }} strategy="idle" />
    </section>
  );
}
