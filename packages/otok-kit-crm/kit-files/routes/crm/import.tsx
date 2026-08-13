import { fail, type OtokActionContext, type OtokContext } from "@kamod-ch/otok/server";
import { getKitCrm, SWISS_DEMO_ORG_ID } from "../../../data/crm-runtime.js";

export const loader = (_ctx: OtokContext) => ({ orgId: SWISS_DEMO_ORG_ID });

export async function action({ formData }: OtokActionContext) {
  const crm = getKitCrm();
  const intent = String(formData?.get("intent") ?? "");
  if (intent === "import") {
    const csv = String(formData?.get("csv") ?? "");
    if (!csv.trim()) fail(400, { message: "CSV required" });
    return crm.importCompaniesCsv(SWISS_DEMO_ORG_ID, csv, "user-sales");
  }
  if (intent === "export") {
    return { csv: crm.exportCompaniesCsv(SWISS_DEMO_ORG_ID) };
  }
  return { ok: false };
}

export default function ImportExportPage() {
  return (
    <section class="space-y-4">
      <a href="/crm" class="text-sm text-sky-600">← CRM</a>
      <h1 class="text-xl font-semibold">CSV Import / Export</h1>
      <form method="post" class="space-y-2">
        <input type="hidden" name="intent" value="import" />
        <textarea name="csv" rows={6} class="w-full rounded border p-2 font-mono text-sm" placeholder="name,uid,canton,city,industry" />
        <button type="submit" class="rounded bg-sky-600 px-3 py-1 text-white text-sm">Importieren</button>
      </form>
      <form method="post">
        <input type="hidden" name="intent" value="export" />
        <button type="submit" class="rounded border px-3 py-1 text-sm">Export CSV</button>
      </form>
    </section>
  );
}
