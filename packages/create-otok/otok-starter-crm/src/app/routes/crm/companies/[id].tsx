import { notFound, type OtokActionContext } from "otok/server";
import { FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { Island } from "otok/client";
import CompanyEditor from "../../../islands/crm-company-editor";
import ActivityPanel from "../../../islands/crm-activity-panel";
import { addActivityAction, getActivities, getCompany, updateCompanyAction } from "../../../data/crm";

export const client = true;

export const chrome = ({ data }: { data: { company: { name: string } } }) => ({
  title: data.company.name,
  description: "Edit company and log activities.",
});

export const head = ({ data }: { data: { company: { name: string } } }) => ({
  title: `${data.company.name} | CRM`,
});

export const loader = ({ params }: { params: { id: string } }) => {
  const company = getCompany(params.id);
  if (!company) notFound("Company not found");
  return { company, activities: getActivities(params.id) };
};

export async function action(context: OtokActionContext) {
  const intent = String(context.formData?.get("intent") ?? "update");
  if (intent === "add-activity") return addActivityAction(context);
  return updateCompanyAction(context);
}

export default function CrmCompanyPage({
  data,
  actionData,
  params,
}: {
  data: Awaited<ReturnType<typeof loader>>;
  actionData?: unknown;
  params: { id: string };
}) {
  const failure = readFormFailure(actionData);

  return (
    <section class="space-y-8">
      <div>
        <a href="/crm" class="text-sm text-sky-600 hover:underline">
          ← Back to companies
        </a>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.company.name}</h2>
        <p class="mt-1 text-sm text-slate-500">Last updated {new Date(data.company.updatedAt).toLocaleString()}</p>
      </div>

      <FormAlert message={failure?.message} />

      {/* Progressive enhancement: native form works without JS */}
      <form method="post" class="grid max-w-lg gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950" data-testid="company-native-form">
        <FormField
          name="name"
          label="Company name"
          defaultValue={failure?.values?.name ?? data.company.name}
          errors={failure?.fieldErrors?.name}
          required
        />
        <FormField
          name="industry"
          label="Industry"
          defaultValue={failure?.values?.industry ?? data.company.industry}
          errors={failure?.fieldErrors?.industry}
        />
        <input type="hidden" name="id" value={params.id} />
        <div class="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="save-stay"
            class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
          >
            Save
          </button>
          <button
            type="submit"
            name="intent"
            value="save"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            Save & return
          </button>
        </div>
      </form>

      <Island
        component={CompanyEditor}
        props={{ company: data.company, fieldErrors: failure?.fieldErrors }}
        strategy="load"
      />

      <Island
        component={ActivityPanel}
        props={{ companyId: params.id, activities: data.activities }}
        strategy="load"
      />
    </section>
  );
}
