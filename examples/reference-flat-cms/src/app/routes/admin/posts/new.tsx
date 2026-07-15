import { Island } from "otok/client";
import { fail, redirect, type OtokActionContext, type OtokPageProps } from "otok/server";
import { posts, type Post } from "../../../data/posts";
import LivePreview from "../../../islands/live-preview";

interface FormFailure {
  message: string;
  fieldErrors?: Record<string, string[]>;
  values?: Partial<Post>;
}

function validate(formData: FormData | undefined) {
  const title = String(formData?.get("title") ?? "").trim();
  const excerpt = String(formData?.get("excerpt") ?? "").trim();
  const body = String(formData?.get("body") ?? "").trim();
  const status = formData?.get("status") === "published" ? "published" : "draft";
  const fieldErrors: Record<string, string[]> = {};

  if (!title) fieldErrors.title = ["Title is required."];
  if (!excerpt) fieldErrors.excerpt = ["Excerpt is required."];
  if (!body) fieldErrors.body = ["Body is required."];

  return { title, excerpt, body, status: status as Post["status"], fieldErrors };
}

export async function action({ formData }: OtokActionContext) {
  const input = validate(formData);
  if (Object.keys(input.fieldErrors).length > 0) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: input.fieldErrors,
      values: input,
    });
  }

  const post = posts.save(input);
  redirect(`/admin/posts/${post.slug}`, 303);
}

export default function NewPost({ actionData }: OtokPageProps<unknown, FormFailure>) {
  const values = actionData?.values ?? {};
  return (
    <section class="editor-layout">
      <form method="post" class="card editor-form">
        <h1>New post</h1>
        <label>
          Title
          <input name="title" value={values.title ?? ""} aria-invalid={Boolean(actionData?.fieldErrors?.title)} />
        </label>
        {actionData?.fieldErrors?.title?.map((error) => <p role="alert" class="form-error">{error}</p>)}
        <label>
          Excerpt
          <input name="excerpt" value={values.excerpt ?? ""} aria-invalid={Boolean(actionData?.fieldErrors?.excerpt)} />
        </label>
        <label>
          Body
          <textarea name="body" rows={8} aria-invalid={Boolean(actionData?.fieldErrors?.body)}>{values.body ?? ""}</textarea>
        </label>
        <label>
          Status
          <select name="status" value={values.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button class="button">Save post</button>
      </form>
      <Island component={LivePreview} props={{ initialTitle: values.title ?? "", initialBody: values.body ?? "" }} strategy="idle" />
    </section>
  );
}
