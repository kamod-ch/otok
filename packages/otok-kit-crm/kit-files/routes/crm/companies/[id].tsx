import { fail, redirect, type OtokActionContext, type OtokContext } from "@kamod-ch/otok/server";
import { getKitCrm, SWISS_DEMO_ORG_ID } from "../../../data/crm-runtime.js";

export const loader = ({ params }: OtokContext) => {
  const crm = getKitCrm();
  const company = crm.getCompany(SWISS_DEMO_ORG_ID, params.id ?? "");
  if (!company) fail(404, { message: "Company not found" });
  return {
    company,
    contacts: crm.listContacts(SWISS_DEMO_ORG_ID, company.id),
    activities: crm.listActivities(SWISS_DEMO_ORG_ID, company.id),
    notes: crm.listNotes(SWISS_DEMO_ORG_ID, "company", company.id),
  };
};

export async function action(ctx: OtokActionContext) {
  const crm = getKitCrm();
  const id = ctx.params.id ?? "";
  const intent = String(ctx.formData?.get("intent") ?? "");

  if (intent === "update-company") {
    const name = String(ctx.formData?.get("name") ?? "").trim();
    const industry = String(ctx.formData?.get("industry") ?? "").trim();
    if (!name) fail(400, { fieldErrors: { name: ["Required"] } });
    crm.updateCompany(SWISS_DEMO_ORG_ID, id, { name, industry: industry || undefined });
    redirect("/crm?updated=1", 303);
  }

  if (intent === "add-activity") {
    const subject = String(ctx.formData?.get("subject") ?? "").trim();
    if (!subject) fail(400, { fieldErrors: { subject: ["Required"] } });
    crm.addActivity({
      orgId: SWISS_DEMO_ORG_ID,
      companyId: id,
      type: "note",
      subject,
      occurredAt: new Date().toISOString(),
      userId: "user-sales",
    });
    return { ok: true };
  }

  return { ok: false };
}

export default function CompanyDetailPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-6">
      <a href="/crm" class="text-sm text-sky-600">← Unternehmen</a>
      <h1 class="text-2xl font-semibold">{data.company.name}</h1>
      <dl class="grid grid-cols-2 gap-2 text-sm">
        <dt class="font-medium">UID</dt><dd>{data.company.uid ?? "—"}</dd>
        <dt class="font-medium">Kanton</dt><dd>{data.company.canton ?? "—"}</dd>
        <dt class="font-medium">Rechtsform</dt><dd>{data.company.legalForm ?? "—"}</dd>
      </dl>

      <form method="post" class="space-y-2 rounded border p-4">
        <input type="hidden" name="intent" value="update-company" />
        <label class="block text-sm">Name<input name="name" defaultValue={data.company.name} class="mt-1 w-full rounded border px-2 py-1" /></label>
        <label class="block text-sm">Branche<input name="industry" defaultValue={data.company.industry ?? ""} class="mt-1 w-full rounded border px-2 py-1" /></label>
        <button type="submit" class="rounded bg-sky-600 px-3 py-1 text-white text-sm">Speichern</button>
      </form>

      <section>
        <h2 class="font-medium">Kontakte</h2>
        <ul class="text-sm">{data.contacts.map((c) => <li key={c.id}>{c.firstName} {c.lastName} — {c.email}</li>)}</ul>
      </section>

      <section>
        <h2 class="font-medium">Aktivitäten</h2>
        <ul class="text-sm">{data.activities.map((a) => <li key={a.id}>{a.subject}</li>)}</ul>
        <form method="post" class="mt-2 flex gap-2">
          <input type="hidden" name="intent" value="add-activity" />
          <input name="subject" placeholder="Neue Aktivität" class="rounded border px-2 py-1" />
          <button type="submit" class="rounded border px-2 py-1 text-sm">Hinzufügen</button>
        </form>
      </section>
    </section>
  );
}
