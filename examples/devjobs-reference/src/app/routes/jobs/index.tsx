import { AppShell } from "../../components/app-shell.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { defineRendering } from "@kamod-ch/otok/rendering";
import { composeLoader } from "@kamod-ch/otok/route";
import { withDb } from "@kamod-ch/otok-kysely/loader";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import type { OtokPageProps } from "@kamod-ch/otok/server";
import { listPublicJobs } from "../../../lib/jobs.js";
import type { DevjobsDatabase } from "../../../db/types.js";
import { Button } from "@kamod-ch/ui/button";

export const rendering = defineRendering({
  mode: "ssr",
  cache: { public: true, maxAge: 120, vary: ["Accept-Language"] },
});

export const loader = composeLoader(async (ctx) => {
  const { db, hono, i18n } = ctx as typeof ctx & {
    db: import("kysely").Kysely<DevjobsDatabase>;
    i18n: { t: (key: string) => string };
  };
  const url = new URL(hono.req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const listing = await listPublicJobs(db, { q, page });

  let user = null;
  const authRuntime = tryGetAuthRuntime();
  if (authRuntime) {
    user = await authFromOtokContext(hono, authRuntime.helpers).getSession();
  }

  return {
    listing,
    q: q ?? "",
    page,
    cacheMarker: `${q ?? ""}|${page}`,
    copy: { title: i18n.t("jobs.title"), search: i18n.t("jobs.search"), pageLabel: i18n.t("jobs.page") },
    user,
    i18n: serializeI18n(hono),
  };
}, withDb<DevjobsDatabase>());

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
  description: "Public job listings with search and pagination.",
}));

export default function JobsIndex({ data }: OtokPageProps<any>) {
  const { listing, q, page, copy } = data;
  const totalPages = Math.max(1, Math.ceil(listing.total / listing.pageSize));

  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <h1 class="text-3xl font-semibold">{copy.title}</h1>
        <form method="get" class="flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
          <label class="flex flex-1 flex-col gap-1 text-sm">
            {copy.search}
            <input name="q" value={q} class="rounded-md border border-border px-3 py-2" aria-label={copy.search} />
          </label>
          <input type="hidden" name="page" value="1" />
          <Button type="submit">{copy.search}</Button>
        </form>
        <p class="text-xs text-muted-foreground" data-testid="cache-marker">
          {data.cacheMarker}
        </p>
        <ul class="divide-y divide-border rounded-lg border border-border">
          {listing.jobs.map((job: any) => (
            <li key={job.id} class="px-4 py-4">
              <a href={`/jobs/${job.slug}`} class="font-medium hover:underline">
                {job.title}
              </a>
              <p class="text-sm text-muted-foreground">{job.company_name}</p>
            </li>
          ))}
        </ul>
        <nav class="flex flex-wrap gap-2 text-sm" aria-label="Pagination">
          {page > 1 && (
            <a
              href={`/jobs?q=${encodeURIComponent(q)}&page=${page - 1}`}
              class="rounded border border-border px-3 py-1"
            >
              ← {copy.pageLabel} {page - 1}
            </a>
          )}
          <span class="px-2 py-1">
            {copy.pageLabel} {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/jobs?q=${encodeURIComponent(q)}&page=${page + 1}`}
              class="rounded border border-border px-3 py-1"
            >
              {copy.pageLabel} {page + 1} →
            </a>
          )}
        </nav>
      </section>
    </AppShell>
  );
}
