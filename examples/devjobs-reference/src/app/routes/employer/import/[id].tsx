import { AppShell } from "../../../components/app-shell.js";
import { defineEmployerLoader, defineEmployerAction } from "../../../../lib/devjobs-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { getQueueClient } from "@kamod-ch/otok-queue";
import { notFound, redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { Button } from "@kamod-ch/ui/button";
import type { DevjobsQueueJobs } from "../../../../lib/import-worker.js";

export const loader = defineEmployerLoader(async ({ db, user, hono, i18n, params }) => {
  const id = params.id as string;
  const record = await db
    .selectFrom("job_import")
    .selectAll()
    .where("id", "=", id)
    .where("company_id", "=", user.companyId)
    .executeTakeFirst();
  if (!record) notFound();
  return { record, user, i18n: serializeI18n(hono), title: `Import ${id}` };
});

export const head = defineMeta(({ data }: { data: any }) => ({ title: data.title, robots: "noindex" }));

export const action = defineEmployerAction(async ({ db, user, hono, params, formData }) => {
  const intent = formData?.get("_intent");
  if (intent !== "retry") redirect(hono.req.url, 303);

  const id = params.id as string;
  const record = await db
    .selectFrom("job_import")
    .selectAll()
    .where("id", "=", id)
    .where("company_id", "=", user.companyId)
    .executeTakeFirst();
  if (!record) notFound();

  await db
    .updateTable("job_import")
    .set({ status: "pending", last_error: null, updated_at: new Date().toISOString() })
    .where("id", "=", id)
    .execute();

  const queue = getQueueClient<DevjobsQueueJobs>();
  await queue.enqueue(
    "devjobs.import-csv",
    { importId: id },
    { idempotencyKey: `${id}-retry-${Date.now()}`, idempotencyScope: `company:${user.companyId}` },
  );

  redirect(hono.req.url, 303);
});

export default function ImportStatus({ data }: OtokPageProps<any>) {
  const { record } = data;
  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-xl space-y-4 px-4 py-10 sm:px-6">
        <h1 class="text-2xl font-semibold">{data.title}</h1>
        <dl class="grid gap-2 text-sm">
          <div>
            <dt class="font-medium">Status</dt>
            <dd data-testid="import-status">{record.status}</dd>
          </div>
          <div>
            <dt class="font-medium">Rows</dt>
            <dd>
              {record.rows_imported} / {record.rows_total}
            </dd>
          </div>
          {record.last_error ? (
            <div>
              <dt class="font-medium">Error</dt>
              <dd class="text-destructive">{record.last_error}</dd>
            </div>
          ) : null}
        </dl>
        {record.status === "failed" ? (
          <form method="post">
            <input type="hidden" name="_intent" value="retry" />
            <Button type="submit">Retry import</Button>
          </form>
        ) : null}
        <a href="/employer/import" class="text-sm text-primary hover:underline">
          ← Back to imports
        </a>
      </section>
    </AppShell>
  );
}
