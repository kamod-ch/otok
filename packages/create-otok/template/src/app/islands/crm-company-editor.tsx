import { useState } from "preact/hooks";
import { useAction, useNavigationBlocker, LoadingBoundary } from "otok/client";
import { Input } from "@kamod-ui/core";
import type { Company } from "../data/crm";

export interface CompanyEditorProps {
  company: Company;
  fieldErrors?: Record<string, string[] | undefined>;
}

export default function CompanyEditor({ company, fieldErrors }: CompanyEditorProps) {
  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry);
  const [dirty, setDirty] = useState(false);

  const mutation = useAction<{ ok: boolean; company: Company }>({
    action: `/crm/companies/${company.id}`,
  });

  useNavigationBlocker({ when: dirty, message: "You have unsaved changes." });

  const save = async () => {
    await mutation.submit(
      { intent: "save-stay", name, industry, id: company.id },
      {
        optimistic: {
          [`/crm/companies/${company.id}`]: { company: { ...company, name, industry } },
        },
        navigate: false,
      },
    );
    setDirty(false);
  };

  return (
    <LoadingBoundary state={mutation.state} fallback={<p role="status">Saving company…</p>}>
      <div class="rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/20">
        <p class="text-sm font-medium text-sky-800 dark:text-sky-200">Enhanced editor (useAction)</p>
        <div class="mt-3 grid max-w-lg gap-3">
          <label class="grid gap-1 text-sm">
            <span>Company name</span>
            <Input
              value={name}
              onInput={(e) => {
                setName((e.target as HTMLInputElement).value);
                setDirty(true);
              }}
              aria-invalid={Boolean(fieldErrors?.name?.length || mutation.error)}
            />
          </label>
          <label class="grid gap-1 text-sm">
            <span>Industry</span>
            <Input
              value={industry}
              onInput={(e) => {
                setIndustry((e.target as HTMLInputElement).value);
                setDirty(true);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={mutation.state !== "idle"}
            aria-busy={mutation.state !== "idle"}
            class="w-fit rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save with optimistic update
          </button>
          {mutation.error ? (
            <p role="alert" class="text-sm text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : "Save failed"}
            </p>
          ) : null}
          {mutation.data?.ok ? (
            <p role="status" class="text-sm text-emerald-700">
              Saved at {new Date().toLocaleTimeString()}
            </p>
          ) : null}
        </div>
      </div>
    </LoadingBoundary>
  );
}
