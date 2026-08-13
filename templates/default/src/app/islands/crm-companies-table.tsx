import { useState } from "preact/hooks";
import { useAction, LoadingBoundary, ErrorBoundary } from "@kamod-ch/otok/client";
import type { Company } from "../data/crm";

export interface CompaniesTableProps {
  companies: Company[];
}

export default function CompaniesTable({ companies: initial }: CompaniesTableProps) {
  const [companies, setCompanies] = useState(initial);
  const mutation = useAction<unknown, { companies: Company[] }>("/crm");

  const renameFirst = async () => {
    if (companies.length === 0) return;
    const target = companies[0];
    const optimistic = companies.map((c, i) =>
      i === 0 ? { ...c, name: `${c.name} (optimistic)` } : c,
    );

    try {
      await mutation.submit(
        { intent: "optimistic-rename", id: target.id, name: `${target.name} (optimistic)` },
        {
          optimistic: { "/crm": { companies: optimistic } },
          navigate: false,
        },
      );
      setCompanies(optimistic);
    } catch {
      setCompanies(initial);
    }
  };

  return (
    <ErrorBoundary>
      <LoadingBoundary state={mutation.state}>
        <div class="space-y-4">
          <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-left text-sm" aria-label="Companies">
              <thead class="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th class="px-4 py-3 font-medium">Company</th>
                  <th class="px-4 py-3 font-medium">Industry</th>
                  <th class="px-4 py-3 font-medium">Updated</th>
                  <th class="px-4 py-3 font-medium"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} class="border-t border-slate-200 dark:border-slate-800" data-company-id={company.id}>
                    <td class="px-4 py-3 font-medium text-slate-950 dark:text-white">{company.name}</td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{company.industry}</td>
                    <td class="px-4 py-3 text-slate-500">{new Date(company.updatedAt).toLocaleDateString()}</td>
                    <td class="px-4 py-3">
                      <a href={`/crm/companies/${company.id}`} class="text-sky-600 hover:underline">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => void renameFirst()}
            disabled={mutation.state !== "idle"}
            aria-busy={mutation.state !== "idle"}
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-slate-700"
          >
            Optimistic rename first row
          </button>

          {mutation.error ? (
            <p role="alert" class="text-sm text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : "Update failed"}
            </p>
          ) : null}
        </div>
      </LoadingBoundary>
    </ErrorBoundary>
  );
}
