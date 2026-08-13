import { defineCrmLoader, defineCrmAction } from "../../../../lib/crm-loader.js";
import { fail, redirect } from "@kamod-ch/otok/server";
import { triggerCompanyEnrichment } from "../../../../lib/crm-repository-options.js";
import { CrmShell } from "../../../components/crm-shell.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineCrmLoader(async ({ user, repo, hono }) => {
  const url = new URL((hono as { req: { url: string } }).req.url);
  const id = url.pathname.split("/").pop()!;
  const company = await repo.getCompany(user.orgId, id);
  if (!company) fail(404, { message: "Company not found" });
  const activities = await repo.listActivities(user.orgId, id);
  return { user, company, activities };
});

export const action = defineCrmAction(async ({ user, repo, formData, hono }) => {
  const url = new URL((hono as { req: { url: string } }).req.url);
  const companyId = url.pathname.split("/").pop()!;
  const intent = String(formData?.get("intent") ?? "");

  if (intent === "enrich") {
    const company = await repo.getCompany(user.orgId, companyId);
    if (!company) fail(404, { message: "Company not found" });
    const instance = await triggerCompanyEnrichment({
      id: company.id,
      name: company.name,
      website: company.website,
    });
    redirect(`/crm/companies/${companyId}?enrich=${instance.id}`, 303);
  }

  if (intent === "activity") {
    await repo.addActivity({
      orgId: user.orgId,
      companyId,
      type: String(formData?.get("type") ?? "note"),
      subject: String(formData?.get("subject") ?? ""),
      userId: user.id,
    });
    redirect(`/crm/companies/${companyId}`, 303);
  }

  if (intent === "contact") {
    await repo.addContact({
      orgId: user.orgId,
      companyId,
      firstName: String(formData?.get("firstName") ?? ""),
      lastName: String(formData?.get("lastName") ?? ""),
      email: String(formData?.get("email") ?? "") || undefined,
      userId: user.id,
    });
    redirect(`/crm/companies/${companyId}`, 303);
  }

  if (intent === "task") {
    await repo.assignTask({
      orgId: user.orgId,
      title: String(formData?.get("title") ?? ""),
      assigneeId: String(formData?.get("assigneeId") ?? user.id),
      relatedId: companyId,
      userId: user.id,
    });
    redirect(`/crm/companies/${companyId}`, 303);
  }

  if (intent === "pipeline") {
    const stageId = String(formData?.get("stageId") ?? "");
    await repo.updateCompanyStage(user.orgId, companyId, stageId, user.id);
    redirect(`/crm/companies/${companyId}`, 303);
  }

  return { ok: false };
});

export default function CompanyDetail({
  data,
}: {
  data: {
    company: {
      id: string;
      name: string;
      uid: string | null;
      street: string | null;
      postal_code: string | null;
      city: string | null;
      legal_form: string | null;
      source: string | null;
      stage_id: string | null;
      website: string | null;
    };
    activities: Array<{ subject: string; type: string; occurred_at: string }>;
    user: { id: string; name: string };
  };
}) {
  const c = data.company;
  return (
    <CrmShell user={data.user as never}>
      <div class="space-y-8">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <dl class="mt-4 grid grid-cols-[8rem_1fr] gap-1 text-sm">
            <dt class="text-muted-foreground">UID</dt>
            <dd>{c.uid}</dd>
            <dt class="text-muted-foreground">Rechtsform</dt>
            <dd>{c.legal_form}</dd>
            <dt class="text-muted-foreground">Adresse</dt>
            <dd>{[c.street, c.postal_code, c.city].filter(Boolean).join(", ")}</dd>
            <dt class="text-muted-foreground">Website</dt>
            <dd>{c.website ?? "—"}</dd>
            <dt class="text-muted-foreground">Quelle</dt>
            <dd>{c.source}</dd>
            <dt class="text-muted-foreground">Stage</dt>
            <dd>{c.stage_id}</dd>
          </dl>
        </div>

        <form method="post" class="flex flex-wrap items-end gap-2">
          <input type="hidden" name="intent" value="enrich" />
          <Button type="submit" variant="outline">
            Anreicherung starten
          </Button>
        </form>

        <form method="post" class="flex flex-wrap items-end gap-2">
          <input type="hidden" name="intent" value="pipeline" />
          <select name="stageId" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="stage-lead">Lead</option>
            <option value="stage-qualified">Qualifiziert</option>
            <option value="stage-proposal">Offerte</option>
            <option value="stage-won">Gewonnen</option>
          </select>
          <Button type="submit" variant="secondary">
            Pipeline aktualisieren
          </Button>
        </form>

        <section class="space-y-3">
          <h2 class="text-lg font-medium">Aktivität protokollieren</h2>
          <form method="post" class="grid max-w-md gap-2">
            <input type="hidden" name="intent" value="activity" />
            <input
              name="subject"
              placeholder="Betreff"
              required
              class="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select name="type" class="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="call">Anruf</option>
              <option value="meeting">Meeting</option>
              <option value="email">E-Mail</option>
              <option value="note">Notiz</option>
            </select>
            <Button type="submit">Speichern</Button>
          </form>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-medium">Kontakt erfassen</h2>
          <form method="post" class="grid max-w-md gap-2">
            <input type="hidden" name="intent" value="contact" />
            <input name="firstName" placeholder="Vorname" required class="rounded-md border border-input px-3 py-2 text-sm" />
            <input name="lastName" placeholder="Nachname" required class="rounded-md border border-input px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="E-Mail" class="rounded-md border border-input px-3 py-2 text-sm" />
            <Button type="submit">Kontakt anlegen</Button>
          </form>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-medium">Aufgabe zuweisen</h2>
          <form method="post" class="grid max-w-md gap-2">
            <input type="hidden" name="intent" value="task" />
            <input name="title" placeholder="Aufgabe" required class="rounded-md border border-input px-3 py-2 text-sm" />
            <input type="hidden" name="assigneeId" value={data.user.id} />
            <Button type="submit">Aufgabe erstellen</Button>
          </form>
        </section>

        <section>
          <h2 class="mb-2 text-lg font-medium">Aktivitäten</h2>
          <ul class="space-y-1 text-sm text-muted-foreground">
            {data.activities.map((a, i) => (
              <li key={i}>
                {a.occurred_at.slice(0, 10)} — [{a.type}] {a.subject}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </CrmShell>
  );
}
