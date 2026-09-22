import { AppShell } from "../../../components/app-shell.js";
import { FormActions, FormAlert, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { defineEmployerLoader, defineEmployerSchemaAction } from "../../../../lib/devjobs-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { getQueueClient } from "@kamod-ch/otok-queue";
import { redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { importCsvSchema } from "../../../../schemas/job.js";
import { parseImportCsv, MAX_CSV_BYTES } from "../../../../lib/import-csv.js";
import { newId } from "../../../../lib/ids.js";
import type { DevjobsQueueJobs } from "../../../../lib/import-worker.js";

export const loader = defineEmployerLoader(async ({ db, user, hono, i18n }) => {
  const imports = await db
    .selectFrom("job_import")
    .selectAll()
    .where("company_id", "=", user.companyId)
    .orderBy("created_at", "desc")
    .limit(10)
    .execute();
  return {
    imports,
    user,
    i18n: serializeI18n(hono),
    title: i18n.t("employer.import"),
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({ title: data.title, robots: "noindex" }));

export const action = defineEmployerSchemaAction({
  schema: importCsvSchema,
  handler: async ({ input, db, user }) => {
    if (input.csv.length > MAX_CSV_BYTES) {
      return { message: "CSV too large", fieldErrors: { csv: ["Max 32 KiB"] } };
    }
    const parsed = parseImportCsv(input.csv);
    if (parsed.error) {
      return { message: parsed.error, fieldErrors: { csv: [parsed.error] } };
    }

    const importId = newId("import");
    await db
      .insertInto("job_import")
      .values({
        id: importId,
        company_id: user.companyId,
        created_by: user.id,
        status: "pending",
        csv_content: input.csv,
        rows_total: parsed.rows.length,
        rows_imported: 0,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const queue = getQueueClient<DevjobsQueueJobs>();
    await queue.enqueue(
      "devjobs.import-csv",
      { importId },
      { idempotencyKey: importId, idempotencyScope: `company:${user.companyId}` },
    );

    redirect(`/employer/import/${importId}`, 303);
  },
});

export default function ImportIndex({ data, actionData }: OtokPageProps<any>) {
  const failure = readFormFailure(actionData);

  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        <h1 class="text-2xl font-semibold">{data.title}</h1>
        <form method="post" class="grid gap-4 rounded-lg border border-border p-6">
          <FormAlert message={failure?.message} />
          <label class="grid gap-1 text-sm">
            CSV (max 20 rows)
            <textarea
              name="csv"
              rows={8}
              class="font-mono text-xs rounded-md border border-border px-3 py-2"
              aria-invalid={Boolean(failure?.fieldErrors?.csv)}
              placeholder="external_ref,title,description,visibility"
            />
          </label>
          {failure?.fieldErrors?.csv?.map((err: string) => (
            <p role="alert" class="text-sm text-destructive">
              {err}
            </p>
          ))}
          <FormActions submitLabel="Start import" cancelHref="/employer/jobs" />
        </form>
        <div>
          <h2 class="text-lg font-medium">Recent imports</h2>
          <ul class="mt-2 divide-y divide-border rounded border border-border">
            {data.imports.map((row: any) => (
              <li key={row.id} class="px-4 py-2 text-sm">
                <a href={`/employer/import/${row.id}`} class="font-medium hover:underline">
                  {row.id}
                </a>{" "}
                — {row.status} ({row.rows_imported}/{row.rows_total})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
