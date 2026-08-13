import { AppShell } from "../../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { loginSchema } from "../../schemas/auth.js";
import { verifyPassword } from "../../lib/password.js";
import type { SaasDatabase } from "../../db/types.js";

export const loader = defineLoader(({ i18n, hono }) => ({
  copy: {
    title: i18n.t("login.title"),
    submit: i18n.t("login.submit"),
    demo: i18n.t("login.demo"),
  },
  i18n: serializeI18n(hono),
}));

export const head = defineMeta(({ data }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export const action = defineAction({
  schema: loginSchema,
  handler: async ({ input, hono, db }) => {
    const database = db as import("kysely").Kysely<SaasDatabase>;
    const row = await database
      .selectFrom("users")
      .selectAll()
      .where("email", "=", input.email)
      .executeTakeFirst();

    if (!row || !verifyPassword(input.password, row.passwordHash)) {
      return {
        message: "Invalid email or password",
        values: { email: input.email },
      };
    }

    await getAuthRuntime().helpers.createSession(hono, row.id);
    redirect("/dashboard", 303);
  },
});

export default function LoginPage({ data, actionData }: OtokPageProps<typeof loader>) {
  const failure = readFormFailure(actionData);

  return (
    <AppShell i18n={data.i18n} title={data.copy.title}>
      <section class="mx-auto grid max-w-md gap-6 px-6 py-16">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
          <p class="text-sm text-muted-foreground">{data.copy.demo}</p>
        </div>
        <form method="post" class="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <FormAlert message={failure?.message} />
          <FormField
            name="email"
            label="Email"
            type="email"
            defaultValue={failure?.values?.email}
            errors={failure?.fieldErrors?.email}
            required
          />
          <FormField
            name="password"
            label="Password"
            type="password"
            errors={failure?.fieldErrors?.password}
            required
          />
          <FormActions submitLabel={data.copy.submit} cancelHref="/" />
        </form>
      </section>
    </AppShell>
  );
}
