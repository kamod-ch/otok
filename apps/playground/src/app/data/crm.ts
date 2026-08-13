import { fail, redirect, type OtokActionContext, type OtokPageProps } from "@kamod-ch/otok/server";

export type Company = {
  id: string;
  name: string;
  industry: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  companyId: string;
  note: string;
  createdAt: string;
};

const companies: Company[] = [
  { id: "acme", name: "Acme Corp", industry: "Manufacturing", updatedAt: "2026-08-01T10:00:00Z" },
  { id: "northwind", name: "Northwind Traders", industry: "Retail", updatedAt: "2026-08-02T14:30:00Z" },
];

const activities: Activity[] = [
  { id: "a1", companyId: "acme", note: "Initial discovery call", createdAt: "2026-08-01T11:00:00Z" },
];

export function getCompanies(): Company[] {
  return companies;
}

export function getCompany(id: string): Company | undefined {
  return companies.find((c) => c.id === id);
}

export function getActivities(companyId: string): Activity[] {
  return activities.filter((a) => a.companyId === companyId);
}

export async function updateCompanyAction({ formData, params }: OtokActionContext) {
  const id = params.id ?? String(formData?.get("id") ?? "");
  const company = companies.find((c) => c.id === id);
  if (!company) fail(404, { message: "Company not found" });

  const name = String(formData?.get("name") ?? "").trim();
  const industry = String(formData?.get("industry") ?? "").trim();
  if (!name) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { name: ["Company name is required"] },
      values: { name, industry },
    });
  }

  company.name = name;
  company.industry = industry || company.industry;
  company.updatedAt = new Date().toISOString();

  const intent = String(formData?.get("intent") ?? "");
  if (intent === "save-stay") {
    return { ok: true, company };
  }

  redirect("/crm?updated=1", 303);
}

export async function addActivityAction({ formData, params }: OtokActionContext) {
  const companyId = params.id ?? String(formData?.get("companyId") ?? "");
  const note = String(formData?.get("note") ?? "").trim();
  if (!note) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { note: ["Activity note is required"] },
    });
  }

  const activity: Activity = {
    id: `a${activities.length + 1}`,
    companyId,
    note,
    createdAt: new Date().toISOString(),
  };
  activities.unshift(activity);
  return { ok: true, activity };
}

export type CrmIndexData = {
  companies: Company[];
  updated?: boolean;
};

export type CrmCompanyData = {
  company: Company;
  activities: Activity[];
};

export function parseCrmIndexProps({ data, loaderData }: OtokPageProps<CrmIndexData>) {
  return data ?? loaderData;
}

export function parseCrmCompanyProps({ data, loaderData }: OtokPageProps<CrmCompanyData>) {
  return data ?? loaderData;
}
