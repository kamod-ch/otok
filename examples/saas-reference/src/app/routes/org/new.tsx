import { AppShell } from "../../components/app-shell.js";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "otok/server";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { createOrgSchema } from "../../../schemas/org.js";
import { newId, slugify } from "../../../lib/ids.js";
import { ensureBillingRecord } from "../../../lib/billing-adapter.js";
import { setActiveOrgCookie } from "../../../lib/tenant.js";
import type { SaasDatabase } from "../../../db/types.js";
import { getAuditRuntime } from "@kamod-ch/otok-audit";

export const loader = defineLoader(async ({ i18n, hono }) => {
  const runtime = tryGetAuthRuntime();
  if (!runtime) throw new Error("auth required");
  const user = await authFromOtokContext(hono, runtime.helpers).requireUser();
  return {
    copy: { title: i18n.t("org.new.title"), submit: i18n.t("org.new.submit") },
    user,
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }) => ({ title: data.copy.title, robots: "noindex" }));

export const action = defineAction({
  schema: createOrgSchema,
  handler: async ({ input, hono, db }) => {
    if (!db) throw new Error("database unavailable");
    const database = db as import("kysely").Kysely<SaasDatabase>;
    const runtime = tryGetAuthRuntime();
    if (!runtime) throw new Error("auth required");
    const user = await authFromOtokContext(hono, runtime.helpers).requireUser();

    const slug = input.slug?.trim() || slugify(input.name);
    const taken = await database
      .selectFrom("organization")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    if (taken) {
      return { message: "Slug already taken", values: { name: input.name, slug } };
    }

    const orgId = newId("org");
    const now = new Date().toISOString();
    await database
      .insertInto("organization")
      .values({ id: orgId, slug, name: input.name.trim(), owner_id: user.id, created_at: now })
      .execute();
    await database
      .insertInto("org_member")
      .values({ org_id: orgId, user_id: user.id, role: "owner", created_at: now })
      .execute();
    await ensureBillingRecord(database, orgId, "free");

    await getAuditRuntime().record({
      tenantId: orgId,
      actor: { id: user.id, type: "user", email: user.email, name: user.name ?? undefined },
      action: "org.created",
      resource: { type: "organization", id: orgId, name: input.name },
    });

    setActiveOrgCookie(hono, orgId);
    redirect("/dashboard", 303);
  },
});

export default function NewOrgPage({ data, actionData }: OtokPageProps<typeof loader>) {
  const failure = readFormFailure(actionData);
  return (
    <AppShell title={data.copy.title} i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-md px-6 py-16">
        <h1 class="mb-6 text-3xl font-semibold">{data.copy.title}</h1>
        <form method="post" class="grid gap-4 rounded-xl border border-border bg-card p-6">
          <FormAlert message={failure?.message} />
          <FormField name="name" label="Name" defaultValue={failure?.values?.name} required />
          <FormField name="slug" label="Slug (optional)" defaultValue={failure?.values?.slug} />
          <FormActions submitLabel={data.copy.submit} />
        </form>
      </section>
    </AppShell>
  );
}
