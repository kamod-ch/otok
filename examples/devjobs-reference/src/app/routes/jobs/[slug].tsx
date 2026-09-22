import { AppShell } from "../../components/app-shell.js";
import { composeLoader } from "@kamod-ch/otok/route";
import { withDb } from "@kamod-ch/otok-kysely/loader";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { notFound, type OtokPageProps } from "@kamod-ch/otok/server";
import type { DevjobsDatabase } from "../../../db/types.js";
import { canViewJob, resolveCompanyContext } from "../../../lib/tenant.js";

export const loader = composeLoader(
  async (ctx) => {
    const { db, hono, params } = ctx as typeof ctx & {
      db: import("kysely").Kysely<DevjobsDatabase>;
      params: Record<string, string>;
    };
  const slug = params.slug as string;
  const job = await db
    .selectFrom("job_posting")
    .innerJoin("company", "company.id", "job_posting.company_id")
    .select([
      "job_posting.id",
      "job_posting.title",
      "job_posting.description",
      "job_posting.visibility",
      "job_posting.company_id",
      "job_posting.slug",
      "company.name as company_name",
    ])
    .where("job_posting.slug", "=", slug)
    .executeTakeFirst();

  if (!job) notFound();

  let viewerCompanyId: string | undefined;
  const authRuntime = tryGetAuthRuntime();
  let user = null;
  if (authRuntime) {
    user = await authFromOtokContext(hono, authRuntime.helpers).getSession();
    if (user) {
      const ctx = await resolveCompanyContext(db, user);
      viewerCompanyId = ctx?.companyId;
    }
  }

  if (!(await canViewJob(db, job, viewerCompanyId))) {
    notFound();
  }

  return {
    job,
    user,
    i18n: serializeI18n(hono),
    title: job.title,
  };
  },
  withDb<DevjobsDatabase>(),
);

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.title,
}));

export default function JobDetail({ data }: OtokPageProps<any>) {
  const { job } = data;
  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <article class="mx-auto max-w-2xl space-y-4 px-4 py-10 sm:px-6">
        <p class="text-sm text-muted-foreground">{job.company_name}</p>
        <h1 class="text-3xl font-semibold">{job.title}</h1>
        <p class="whitespace-pre-wrap leading-relaxed">{job.description}</p>
        {job.visibility === "private" ? (
          <p class="text-xs uppercase tracking-wide text-amber-700">Private listing</p>
        ) : null}
      </article>
    </AppShell>
  );
}
