import { AppShell } from "../../../components/app-shell.js";
import { defineEmployerLoader } from "../../../../lib/devjobs-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import type { OtokPageProps } from "@kamod-ch/otok/server";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineEmployerLoader(async ({ db, user, hono, i18n }) => {
  const jobs = await db
    .selectFrom("job_posting")
    .selectAll()
    .where("company_id", "=", user.companyId)
    .orderBy("updated_at", "desc")
    .execute();

  return {
    jobs,
    user,
    companyName: user.companyName,
    copy: { title: i18n.t("employer.title"), newJob: i18n.t("employer.new"), importCsv: i18n.t("employer.import") },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export default function EmployerJobs({ data }: OtokPageProps<any>) {
  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold">{data.copy.title}</h1>
            <p class="text-sm text-muted-foreground">{data.companyName}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/employer/jobs/new">{data.copy.newJob}</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/employer/import">{data.copy.importCsv}</a>
            </Button>
          </div>
        </div>
        <ul class="divide-y divide-border rounded-lg border border-border">
          {data.jobs.map((job: any) => (
            <li key={job.id} class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <a href={`/jobs/${job.slug}`} class="font-medium hover:underline">
                  {job.title}
                </a>
                <span class="ml-2 text-xs uppercase text-muted-foreground">{job.visibility}</span>
              </div>
              <a href={`/employer/jobs/${job.id}/edit`} class="text-sm text-primary hover:underline">
                Edit
              </a>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
