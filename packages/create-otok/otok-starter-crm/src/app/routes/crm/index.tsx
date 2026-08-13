import { Button } from "@kamod-ch/ui/button";
import { Island } from "@kamod-ch/otok/client";
import type { OtokActionContext, OtokContext } from "@kamod-ch/otok/server";
import CompaniesTable from "../../islands/crm-companies-table";
import { getCompanies, getCompany } from "../../data/crm";

export const client = true;

export const chrome = () => ({
  title: "CRM",
  description: "Companies overview with optimistic table updates.",
});

export const head = () => ({
  title: "CRM | Otok Starter",
  description: "Mutation and optimistic UI demo with useAction and useFetcher.",
});

export const loader = ({ request }: OtokContext) => {
  const url = new URL(request.url);
  return {
    companies: getCompanies(),
    updated: url.searchParams.has("updated"),
  };
};

export async function action({ formData }: OtokActionContext) {
  const intent = String(formData?.get("intent") ?? "");
  if (intent === "optimistic-rename") {
    const id = String(formData?.get("id") ?? "");
    const name = String(formData?.get("name") ?? "").trim();
    const company = getCompany(id);
    if (company && name) company.name = name;
    return { ok: true, companies: getCompanies() };
  }
  return { ok: false };
}

export default function CrmIndexPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-sky-600 dark:text-sky-300">CRM demo</p>
          <h2 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Companies</h2>
          <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Edit companies, add activities, and see optimistic table updates — with or without JavaScript.
          </p>
        </div>
        <Button href="/crm/companies/acme" variant="outline" size="sm">
          Edit Acme
        </Button>
      </div>

      {data.updated ? (
        <p role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Company updated successfully.
        </p>
      ) : null}

      <Island component={CompaniesTable} props={{ companies: data.companies }} strategy="load" />
    </section>
  );
}
