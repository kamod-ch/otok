import { AppShell } from "../components/app-shell.js";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { redirect, type OtokPageProps } from "otok/server";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineLoader(async ({ i18n, hono }) => {
  const runtime = tryGetAuthRuntime();
  let user = null;
  if (runtime) {
    const auth = authFromOtokContext(hono, runtime.helpers);
    user = await auth.getSession();
    if (user) redirect("/dashboard", 303);
  }
  return {
    copy: {
      title: i18n.t("home.title"),
      lead: i18n.t("home.lead"),
      cta: i18n.t("home.cta"),
    },
    user,
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
  description: data.copy.lead,
}));

export default function HomePage({ data }: OtokPageProps<any>) {
  return (
    <AppShell title={data.copy.title} i18n={data.i18n} user={data.user}>
      <section class="mx-auto grid max-w-3xl gap-8 px-6 py-20">
        <div class="space-y-4">
          <h1 class="text-4xl font-semibold tracking-tight">{data.copy.title}</h1>
          <p class="text-lg text-muted-foreground">{data.copy.lead}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="/register">{data.i18n.messages["nav.register"] ?? "Register"}</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/login">{data.i18n.messages["nav.login"] ?? "Sign in"}</a>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
