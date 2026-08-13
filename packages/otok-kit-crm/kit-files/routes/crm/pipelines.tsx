import type { OtokContext } from "@kamod-ch/otok/server";
import { getKitCrm, SWISS_DEMO_ORG_ID } from "../../../data/crm-runtime.js";

export const loader = (_ctx: OtokContext) => {
  const crm = getKitCrm();
  return { pipelines: crm.listPipelines(SWISS_DEMO_ORG_ID) };
};

export default function PipelinesPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-4">
      <a href="/crm" class="text-sm text-sky-600">← CRM</a>
      <h1 class="text-xl font-semibold">Pipelines</h1>
      {data.pipelines.map((p) => (
        <article key={p.id} class="rounded border p-4">
          <h2 class="font-medium">{p.name}</h2>
          <ol class="mt-2 list-decimal pl-5 text-sm">
            {p.stages.sort((a, b) => a.order - b.order).map((s) => (
              <li key={s.id}>{s.name} ({s.probability}%)</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
