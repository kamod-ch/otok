import type { OtokContext, OtokActionContext } from "otok/server";
import { fail, redirect } from "otok/server";
import { getKitCrm, SWISS_DEMO_ORG_ID } from "../../data/crm-runtime.js";
import { t } from "@otok/kit-crm";

export const loader = ({ request }: OtokContext) => {
  const crm = getKitCrm();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const canton = url.searchParams.get("canton") ?? undefined;
  const companies = q || canton
    ? crm.searchCompanies({ orgId: SWISS_DEMO_ORG_ID, q, canton })
    : crm.listCompanies(SWISS_DEMO_ORG_ID);
  return {
    companies,
    orgId: SWISS_DEMO_ORG_ID,
    locale: "de" as const,
    title: t("de", "crm.companies"),
    updated: url.searchParams.has("updated"),
  };
};

export async function action({ formData }: OtokActionContext) {
  const intent = String(formData?.get("intent") ?? "");
  if (intent === "search") return { ok: true };
  return { ok: false };
}

export default function CrmIndexPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">{data.title}</h1>
        <p class="text-sm text-slate-600">Swiss B2B CRM — UID, Kanton, Pipeline</p>
      </header>

      <form method="get" class="flex flex-wrap gap-2">
        <input name="q" placeholder={t(data.locale, "crm.search.placeholder")} class="rounded border px-3 py-2" />
        <input name="canton" placeholder="ZH, VD, BE…" class="w-24 rounded border px-3 py-2" />
        <button type="submit" class="rounded bg-sky-600 px-4 py-2 text-white">Suchen</button>
      </form>

      {data.updated ? <p role="status" class="text-emerald-700">Gespeichert.</p> : null}

      <table class="w-full text-left text-sm">
        <thead>
          <tr>
            <th class="py-2">Name</th>
            <th>UID</th>
            <th>Kanton</th>
            <th>Branche</th>
          </tr>
        </thead>
        <tbody>
          {data.companies.map((c) => (
            <tr key={c.id} class="border-t">
              <td class="py-2"><a href={`/crm/companies/${c.id}`}>{c.name}</a></td>
              <td>{c.uid ?? "—"}</td>
              <td>{c.canton ?? "—"}</td>
              <td>{c.industry ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav class="flex gap-4 text-sm">
        <a href="/crm/pipelines">Pipelines</a>
        <a href="/crm/import">Import / Export</a>
      </nav>
    </section>
  );
}
