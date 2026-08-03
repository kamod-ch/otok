import { defineCrmLoader } from "../../../lib/crm-loader.js";
import { CrmShell } from "../../components/crm-shell.js";

export const loader = defineCrmLoader(async ({ user, repo }) => {
  const audit = await repo.listAudit(user.orgId);
  return { user, audit };
});

export default function AuditPage({
  data,
}: {
  data: {
    user: { name: string };
    audit: Array<{ action: string; resource_type: string; resource_id: string; created_at: string; user_id: string | null }>;
  };
}) {
  return (
    <CrmShell user={data.user as never}>
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/40">
                <th class="px-3 py-2 text-left font-medium">Zeit</th>
                <th class="px-3 py-2 text-left font-medium">Aktion</th>
                <th class="px-3 py-2 text-left font-medium">Ressource</th>
                <th class="px-3 py-2 text-left font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.map((row) => (
                <tr key={row.created_at + row.action} class="border-b border-border/60">
                  <td class="px-3 py-2">{row.created_at.slice(0, 19)}</td>
                  <td class="px-3 py-2">{row.action}</td>
                  <td class="px-3 py-2">
                    {row.resource_type}/{row.resource_id.slice(0, 8)}
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">{row.user_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CrmShell>
  );
}
