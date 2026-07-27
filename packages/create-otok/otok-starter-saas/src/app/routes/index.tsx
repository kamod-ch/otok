import { AppShell } from "../components/app-shell.js";
import { Button } from "@kamod-ch/ui/button";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import type { OtokPageProps } from "otok/server";

export const loader = defineLoader(({ i18n, hono }) => ({
  copy: {
    title: i18n.t("home.title"),
    lead: i18n.t("home.lead"),
    cta: i18n.t("home.cta"),
  },
  i18n: serializeI18n(hono),
}));

export const head = defineMeta(({ data }) => ({
  title: data.copy.title,
  description: data.copy.lead,
}));

export default function Home({ data }: OtokPageProps<typeof loader>) {
  return (
    <AppShell i18n={data.i18n} title={data.copy.title}>
      <section class="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <h1 class="text-4xl font-semibold tracking-tight">{data.copy.title}</h1>
        <p class="text-lg text-muted-foreground">{data.copy.lead}</p>
        <Button asChild>
          <a href="/dashboard">{data.copy.cta}</a>
        </Button>
      </section>
    </AppShell>
  );
}
