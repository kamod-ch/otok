import { AppShell } from "../../components/app-shell.js";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { dbFromHono } from "@kamod-ch/otok-kysely";
import { notFound, type OtokPageProps } from "@kamod-ch/otok/server";
import type { RefDatabase } from "../../../db/types.js";

export const loader = defineLoader(async ({ hono, i18n, params }) => {
  const db = dbFromHono<RefDatabase>(hono);
  const article = await db
    .selectFrom("article")
    .selectAll()
    .where("slug", "=", params.slug!)
    .executeTakeFirst();
  if (!article) notFound();
  return {
    article,
    copy: {
      preview: i18n.t("article.preview"),
      full: i18n.t("article.fullThread"),
      back: i18n.t("article.back"),
    },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.article.title,
}));

export default function ArticleDetail({ data }: OtokPageProps<any>) {
  const prefix = data.i18n.locale === "en" ? "/en" : "";
  const slug = data.article.slug;
  return (
    <AppShell title="Discussions Reference" i18n={data.i18n}>
      <article class="space-y-8">
        <p>
          <a href={`${prefix}/articles`} class="text-sm text-muted-foreground hover:underline">
            ← {data.copy.back}
          </a>
        </p>
        <header class="space-y-3 border-b border-border pb-6">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{data.article.thread_kind}</p>
          <h1 class="text-3xl font-semibold leading-tight">{data.article.title}</h1>
          <p class="text-lg text-muted-foreground">{data.article.teaser}</p>
        </header>
        <div class="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">{data.article.body}</div>

        <section
          class="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 shadow-sm"
          aria-labelledby="discussion-preview-heading"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h2 id="discussion-preview-heading" class="text-sm font-semibold uppercase tracking-wide">
              {data.copy.preview}
            </h2>
            <a
              href={`${prefix}/discussions/${slug}/thread`}
              class="text-sm font-medium text-primary hover:underline"
            >
              {data.copy.full} →
            </a>
          </div>
          <iframe
            title={data.copy.preview}
            src={`${prefix}/discussions/${slug}`}
            class="min-h-[420px] w-full border-0 bg-background"
            loading="lazy"
          />
        </section>
      </article>
    </AppShell>
  );
}
