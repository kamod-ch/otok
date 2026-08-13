import { AppShell } from "../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { registerSchema } from "../../schemas/auth.js";
import { hashPassword } from "../../lib/password.js";
import { newId } from "../../lib/ids.js";
import type { SaasDatabase } from "../../db/types.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineLoader(({ i18n, hono }) => ({
  copy: {
    title: i18n.t("register.title"),
    submit: i18n.t("register.submit"),
  },
  i18n: serializeI18n(hono),
  oauth: {
    github: Boolean(process.env.GITHUB_CLIENT_ID),
    google: Boolean(process.env.GOOGLE_CLIENT_ID),
  },
}));

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export const action = defineAction({
  schema: registerSchema,
  handler: async ({ input, hono, db }) => {
    if (!db) throw new Error("database unavailable");
    const database = db as import("kysely").Kysely<SaasDatabase>;
    const existing = await database
      .selectFrom("app_user")
      .select("id")
      .where("email", "=", input.email.toLowerCase())
      .executeTakeFirst();
    if (existing) {
      return { message: "Email already registered", values: { email: input.email, name: input.name } };
    }

    const userId = newId("user");
    await database
      .insertInto("app_user")
      .values({
        id: userId,
        email: input.email.toLowerCase(),
        name: input.name,
        password_hash: hashPassword(input.password),
      } as never)
      .execute();

    await getAuthRuntime().helpers.createSession(hono, userId);
    redirect("/org/new", 303);
  },
});

export default function RegisterPage({ data, actionData }: OtokPageProps<any>) {
  const failure = readFormFailure(actionData);

  return (
    <AppShell title={data.copy.title} i18n={data.i18n}>
      <section class="mx-auto grid max-w-md gap-6 px-6 py-16">
        <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
        <form method="post" class="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <FormAlert message={failure?.message} />
          <FormField name="name" label="Name" defaultValue={failure?.values?.name} errors={failure?.fieldErrors?.name} required />
          <FormField name="email" label="Email" type="email" defaultValue={failure?.values?.email} errors={failure?.fieldErrors?.email} required />
          <FormField name="password" label="Password" type="password" errors={failure?.fieldErrors?.password} required />
          <FormActions submitLabel={data.copy.submit} cancelHref="/login" />
        </form>
        {(data.oauth.github || data.oauth.google) && (
          <div class="grid gap-2">
            {data.oauth.github && (
              <Button asChild variant="outline">
                <a href="/auth/github">GitHub</a>
              </Button>
            )}
            {data.oauth.google && (
              <Button asChild variant="outline">
                <a href="/auth/google">Google</a>
              </Button>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
