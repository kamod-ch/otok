import { AppShell } from "../../components/app-shell.js";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { dbFromHono } from "@kamod-ch/otok-kysely";
import type { OtokPageProps } from "@kamod-ch/otok/server";
import type { RefDatabase } from "../../../db/types.js";

export const loader = defineLoader(async ({ hono, i18n }) => {
  const db = dbFromHono<RefDatabase>(hono);
  const articles = await db.selectFrom("article").selectAll().orderBy("created_at", "asc").execute();
  return {
    articles,
    copy: {
      title: i18n.t("articles.title"),
      lead: i18n.t("articles.lead"),
      read: i18n.t("articles.read"),
    },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
}));

export default function ArticlesIndex({ data }: OtokPageProps<any>) {
  const prefix = data.i18n.locale === "en" ? "/en" : "";
  return (
    <AppShell title="Discussions Reference" i18n={data.i18n}>
      <div class="space-y-8">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
          <p class="text-muted-foreground">{data.copy.lead}</p>
        </div>
        <ul class="grid gap-4">
          {data.articles.map((article: any) => (
            <li
              key={article.id}
              class="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
            >
              <p class="text-xs uppercase tracking-wide text-muted-foreground">{article.thread_kind}</p>
              <h2 class="mt-1 text-xl font-semibold">
                <a href={`${prefix}/articles/${article.slug}`} class="hover:underline">
                  {article.title}
                </a>
              </h2>
              <p class="mt-2 text-sm text-muted-foreground">{article.teaser}</p>
              <a
                href={`${prefix}/articles/${article.slug}`}
                class="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
              >
                {data.copy.read} →
              </a>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
