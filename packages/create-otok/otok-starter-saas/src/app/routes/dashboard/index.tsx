import { AppShell } from "../../components/app-shell.js";
import { Button } from "@kamod-ch/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@kamod-ch/ui/card";
import { defineLoader } from "@kamod-ch/otok-auth/loader";
import { readI18n } from "@kamod-ch/otok-i18n";
import { defineMeta } from "@kamod-ch/otok-seo";
import type { OtokPageProps } from "otok/server";

export const loader = defineLoader(async ({ auth, hono }) => {
  const user = await auth.requireUser();
  const i18n = readI18n(hono);
  if (!i18n) throw new Error("i18n plugin required");

  return {
    user,
    copy: {
      title: i18n.t("dashboard.title"),
      welcome: i18n.t("dashboard.welcome", { email: user.email }),
      projects: i18n.t("nav.projects"),
    },
    i18n: i18n.toClientPayload(),
  };
});

export const head = defineMeta(({ data }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export default function DashboardPage({ data }: OtokPageProps<typeof loader>) {
  return (
    <AppShell i18n={data.i18n} title={data.copy.title} user={data.user}>
      <section class="mx-auto grid max-w-4xl gap-6 px-6 py-10">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
          <p class="text-muted-foreground">{data.copy.welcome}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-3">
            <Button asChild>
              <a href="/projects">{data.copy.projects}</a>
            </Button>
            <form method="post" action="/auth/logout">
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
