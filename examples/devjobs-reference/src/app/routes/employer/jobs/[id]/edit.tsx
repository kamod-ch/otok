import { Island } from "@kamod-ch/otok/client";
import { AppShell } from "../../../../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineEmployerLoader, defineEmployerSchemaAction } from "../../../../../lib/devjobs-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { notFound, redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { jobFormSchema } from "../../../../../schemas/job.js";
import { requireJobOwnership } from "../../../../../lib/tenant.js";
import { uniqueSlug } from "../../../../../lib/jobs.js";
import { JobTitlePreview } from "../../../../components/job-title-preview.js";

export const loader = defineEmployerLoader(async ({ db, user, hono, params }) => {
  const id = params.id as string;
  if (!(await requireJobOwnership(db, id, user.companyId))) notFound();
  const job = await db.selectFrom("job_posting").selectAll().where("id", "=", id).executeTakeFirst();
  if (!job) notFound();
  return { job, user, i18n: serializeI18n(hono), title: `Edit ${job.title}` };
});

export const head = defineMeta(({ data }: { data: any }) => ({ title: data.title, robots: "noindex" }));

export const action = defineEmployerSchemaAction({
  schema: jobFormSchema,
  handler: async ({ input, db, user, hono }) => {
    const id = hono.req.param("id");
    if (!id) return new Response("Bad Request", { status: 400 });
    if (!(await requireJobOwnership(db, id, user.companyId))) {
      return new Response("Forbidden", { status: 403 });
    }
    const slug = await uniqueSlug(db, input.title, id);
    await db
      .updateTable("job_posting")
      .set({
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        slug,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .where("company_id", "=", user.companyId)
      .execute();
    redirect("/employer/jobs", 303);
  },
});

export default function EditJobPage({ data, actionData }: OtokPageProps<any>) {
  const failure = readFormFailure(actionData);
  const job = data.job;
  const values = failure?.values ?? {
    title: job.title,
    description: job.description,
    visibility: job.visibility,
  };

  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 class="mb-6 text-2xl font-semibold">{data.title}</h1>
        <form method="post" data-job-form class="grid gap-4 rounded-lg border border-border p-6">
          <FormAlert message={failure?.message} />
          <FormField
            name="title"
            label="Title"
            defaultValue={values.title}
            errors={failure?.fieldErrors?.title}
            required
          />
          <Island component={JobTitlePreview} props={{ initialTitle: values.title ?? "" }} strategy="load" />
          <label class="grid gap-1 text-sm">
            Description
            <textarea name="description" rows={6} class="rounded-md border border-border px-3 py-2">
              {values.description ?? ""}
            </textarea>
          </label>
          <label class="grid gap-1 text-sm">
            Visibility
            <select
              name="visibility"
              class="rounded-md border border-border px-3 py-2"
              defaultValue={values.visibility}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <FormActions submitLabel="Update" cancelHref="/employer/jobs" />
        </form>
      </section>
    </AppShell>
  );
}
