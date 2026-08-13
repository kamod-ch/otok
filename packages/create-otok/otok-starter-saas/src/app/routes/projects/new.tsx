import { AppShell } from "../../../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineLoader as defineAuthLoader } from "@kamod-ch/otok-auth/loader";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";
import { readI18n } from "@kamod-ch/otok-i18n";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { projectSchema } from "../../../schemas/auth.js";
import type { SaasDatabase } from "../../../db/types.js";

export const loader = defineAuthLoader(async ({ auth, hono }) => {
  const user = await auth.requireUser();
  const i18n = readI18n(hono);
  if (!i18n) throw new Error("i18n plugin required");
  return {
    user,
    copy: {
      title: i18n.t("projects.new"),
      save: i18n.t("project.save"),
      fieldTitle: i18n.t("project.title"),
      fieldDescription: i18n.t("project.description"),
    },
    i18n: i18n.toClientPayload(),
  };
});

export const head = defineMeta(({ data }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export const action = defineAction({
  schema: projectSchema,
  handler: async ({ input, hono, db }) => {
    const user = await getAuthRuntime().helpers.requireUser(hono);
    const database = db as import("kysely").Kysely<SaasDatabase>;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await database
      .insertInto("projects")
      .values({
        id,
        userId: user.id,
        title: input.title,
        description: input.description ? input.description : null,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    redirect("/projects", 303);
  },
});

export default function NewProjectPage({ data, actionData }: OtokPageProps<typeof loader>) {
  const failure = readFormFailure(actionData);

  return (
    <AppShell i18n={data.i18n} title={data.copy.title} user={data.user}>
      <section class="mx-auto max-w-lg px-6 py-10">
        <h1 class="mb-6 text-3xl font-semibold">{data.copy.title}</h1>
        <form method="post" class="grid gap-4 rounded-xl border bg-card p-6">
          <FormAlert message={failure?.message} />
          <FormField
            name="title"
            label={data.copy.fieldTitle}
            defaultValue={failure?.values?.title}
            errors={failure?.fieldErrors?.title}
            required
          />
          <FormField
            name="description"
            label={data.copy.fieldDescription}
            defaultValue={failure?.values?.description}
            errors={failure?.fieldErrors?.description}
          />
          <FormActions submitLabel={data.copy.save} cancelHref="/projects" />
        </form>
      </section>
    </AppShell>
  );
}
