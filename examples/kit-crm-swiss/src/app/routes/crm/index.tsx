import { defineCrmLoader, defineCrmAction } from "../../../lib/crm-loader.js";
import { requirePermission } from "../../../lib/auth-users.js";
import { CRM_PERMISSIONS } from "@kamod-ch/otok-kit-crm";
import { CrmShell } from "../../components/crm-shell.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineCrmLoader(async ({ user, repo, hono }) => {
  const url = new URL((hono as { req: { url: string } }).req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const canton = url.searchParams.get("canton") ?? undefined;
  const companies = await repo.listCompanies(user.orgId, { q, canton });
  const tasks = await repo.listTasks(user.orgId);
  return { user, companies, tasks, q, canton };
});

export const action = defineCrmAction(async ({ user, repo, formData }) => {
  const intent = String(formData?.get("intent") ?? "");
  if (intent === "export") {
    requirePermission(user, CRM_PERMISSIONS.COMPANIES_EXPORT);
    return { csv: await repo.exportCompaniesCsv(user.orgId) };
  }
  return { ok: false };
});

export default function CrmDashboard({
  data,
}: {
  data: {
    user: { name: string; orgId: string; id: string };
    companies: Array<{ id: string; name: string; uid: string | null; canton: string | null; city: string | null; stage_id: string | null }>;
    tasks: Array<{ id: string; title: string; status: string }>;
    q?: string;
    canton?: string;
  };
}) {
  return (
    <CrmShell user={data.user as never}>
      <div class="space-y-6">
        <header>
          <h1 class="text-2xl font-semibold tracking-tight">Unternehmen</h1>
          <p class="text-sm text-muted-foreground">
            {data.user.name} · Mandant {data.user.orgId}
          </p>
        </header>

        <form method="get" class="flex flex-wrap gap-2">
          <input
            name="q"
            placeholder="Suche Name, UID, Ort…"
            value={data.q ?? ""}
            class="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="canton"
            placeholder="Kanton"
            value={data.canton ?? ""}
            class="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" variant="secondary">
            Filtern
          </Button>
        </form>

        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40">
                <th class="px-3 py-2 text-left font-medium">Name</th>
                <th class="px-3 py-2 text-left font-medium">UID</th>
                <th class="px-3 py-2 text-left font-medium">Kanton</th>
                <th class="px-3 py-2 text-left font-medium">Ort</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} class="border-b border-border/60">
                  <td class="px-3 py-2">
                    <a href={`/crm/companies/${c.id}`} class="font-medium hover:underline">
                      {c.name}
                    </a>
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">{c.uid}</td>
                  <td class="px-3 py-2 text-muted-foreground">{c.canton}</td>
                  <td class="px-3 py-2 text-muted-foreground">{c.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section>
          <h2 class="text-lg font-medium">
            Offene Aufgaben ({data.tasks.filter((t) => t.status === "open").length})
          </h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {data.tasks
              .filter((t) => t.status === "open")
              .map((t) => (
                <li key={t.id}>{t.title}</li>
              ))}
          </ul>
        </section>

        <form method="post">
          <input type="hidden" name="intent" value="export" />
          <Button type="submit" variant="outline">
            CSV exportieren
          </Button>
        </form>
      </div>
    </CrmShell>
  );
}
