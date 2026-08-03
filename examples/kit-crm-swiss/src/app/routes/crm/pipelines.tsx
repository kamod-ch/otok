import { defineLoader as defineDbLoader } from "@kamod-ch/otok-kysely/loader";
import type { CrmDatabase } from "@otok/kit-crm/db";
import { CrmShell } from "../../components/crm-shell.js";

export const loader = defineDbLoader<
  { pipelines: Array<{ name: string; stages: unknown }> },
  CrmDatabase
>(async ({ db }) => {
  const pipelines = await db
    .selectFrom("crm_pipelines")
    .selectAll()
    .where("org_id", "=", "org-swiss-demo")
    .execute();
  return { pipelines: pipelines.map((p) => ({ ...p, stages: JSON.parse(p.stages) })) };
});

export default function PipelinesPage({
  data,
}: {
  data: { pipelines: Array<{ name: string; stages: Array<{ id: string; name: string; probability: number }> }> };
}) {
  return (
    <CrmShell>
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold tracking-tight">Pipelines</h1>
        {data.pipelines.map((p) => (
          <article key={p.name} class="rounded-md border border-border p-4">
            <h2 class="font-medium">{p.name}</h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {p.stages.map((s) => (
                <li key={s.id}>
                  {s.name} ({s.probability}%)
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </CrmShell>
  );
}
