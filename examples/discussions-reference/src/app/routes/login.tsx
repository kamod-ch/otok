import { AppShell } from "../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { CSRF_FIELD, ensureCsrfCookie } from "@kamod-ch/otok-auth/csrf";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { loginSchema } from "../../schemas/auth.js";
import { verifyPassword } from "../../lib/password.js";
import { TEST_USERS } from "../../lib/test-users.js";
import type { RefDatabase } from "../../db/types.js";

export const loader = defineLoader(({ i18n, hono, request }) => {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") ?? "/articles";
  const csrfToken = ensureCsrfCookie(hono, { cookieName: "discussions_ref_csrf" });
  return {
    redirectTo,
    csrfToken,
    copy: {
      title: i18n.t("login.title"),
      submit: i18n.t("login.submit"),
      demo: i18n.t("login.demo"),
      passwordHint: i18n.t("login.passwordHint"),
    },
    users: TEST_USERS,
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export const action = defineAction({
  schema: loginSchema,
  handler: async ({ input, hono, db }) => {
    if (!db) throw new Error("database unavailable");
    const database = db as import("kysely").Kysely<RefDatabase>;
    const row = await database
      .selectFrom("app_user")
      .selectAll()
      .where("email", "=", input.email.toLowerCase())
      .executeTakeFirst();

    if (!row || !verifyPassword(input.password, row.password_hash)) {
      return { message: "Invalid email or password", values: { email: input.email } };
    }

    await getAuthRuntime().helpers.createSession(hono, row.id);
    redirect(input.redirect ?? "/articles", 303);
  },
});

export default function LoginPage({ data, actionData }: OtokPageProps<any>) {
  const failure = readFormFailure(actionData);

  return (
    <AppShell title="Discussions Reference" i18n={data.i18n}>
      <section class="mx-auto grid max-w-lg gap-6">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
          <p class="text-sm text-muted-foreground">{data.copy.demo}</p>
          <p class="text-sm text-muted-foreground">{data.copy.passwordHint}</p>
        </div>
        <ul class="grid gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          {data.users.map((u: (typeof TEST_USERS)[number]) => (
            <li key={u.email}>
              <span class="font-medium">{u.label}</span> — <code>{u.email}</code>
            </li>
          ))}
        </ul>
        <form method="post" class="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <input type="hidden" name="redirect" value={data.redirectTo} />
          <input type="hidden" name={CSRF_FIELD} value={data.csrfToken} />
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
          <FormActions submitLabel={data.copy.submit} cancelHref="/articles" />
        </form>
      </section>
    </AppShell>
  );
}
