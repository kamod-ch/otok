import { Island } from "@kamod-ch/otok/client";
import { AppShell } from "../../../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineEmployerSchemaAction } from "../../../../lib/devjobs-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { jobFormSchema } from "../../../../schemas/job.js";
import { uniqueSlug } from "../../../../lib/jobs.js";
import { newId } from "../../../../lib/ids.js";
import { JobTitlePreview } from "../../../components/job-title-preview.js";
import { defineEmployerLoader } from "../../../../lib/devjobs-loader.js";

export const loader = defineEmployerLoader(async ({ user, hono, i18n }) => ({
  user,
  i18n: serializeI18n(hono),
  title: i18n.t("employer.new"),
}));

export const head = defineMeta(({ data }: { data: any }) => ({ title: data.title, robots: "noindex" }));

export const action = defineEmployerSchemaAction({
  schema: jobFormSchema,
  handler: async ({ input, db, user }) => {
    const slug = await uniqueSlug(db, input.title);
    const id = newId("job");
    await db
      .insertInto("job_posting")
      .values({
        id,
        company_id: user.companyId,
        slug,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        external_ref: null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();
    redirect("/employer/jobs", 303);
  },
});

export default function NewJobPage({ data, actionData }: OtokPageProps<any>) {
  const failure = readFormFailure(actionData);
  const values = failure?.values ?? {};

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
          <noscript>
            <p class="text-sm text-muted-foreground">Character count updates when JavaScript is enabled.</p>
          </noscript>
          <Island component={JobTitlePreview} props={{ initialTitle: values.title ?? "" }} strategy="load" />
          <label class="grid gap-1 text-sm">
            Description
            <textarea
              name="description"
              rows={6}
              class="rounded-md border border-border px-3 py-2"
              aria-invalid={Boolean(failure?.fieldErrors?.description)}
            >
              {values.description ?? ""}
            </textarea>
          </label>
          {failure?.fieldErrors?.description?.map((err: string) => (
            <p role="alert" class="text-sm text-destructive">
              {err}
            </p>
          ))}
          <label class="grid gap-1 text-sm">
            Visibility
            <select name="visibility" class="rounded-md border border-border px-3 py-2">
              <option value="public" selected={(values.visibility ?? "public") === "public"}>
                Public
              </option>
              <option value="private" selected={values.visibility === "private"}>
                Private
              </option>
            </select>
          </label>
          <FormActions submitLabel="Save" cancelHref="/employer/jobs" />
        </form>
      </section>
    </AppShell>
  );
}
