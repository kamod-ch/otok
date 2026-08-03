import { DashboardShell } from "../../components/dashboard-shell.js";
import { defineSaasLoader, requirePermission } from "../../../lib/saas-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { getAuditRuntime } from "@kamod-ch/otok-audit";
import type { AuditEntry } from "@kamod-ch/otok-audit";
import type { I18nClientPayload } from "@kamod-ch/otok-i18n";
import type { SaasContextUser } from "../../../db/types.js";

export const loader = defineSaasLoader(async ({ user, db, hono }) => {
  requirePermission(user, "audit:read");
  const result = await getAuditRuntime().search({
    tenantId: user.orgId,
    limit: 50,
  });
  return {
    user,
    entries: result.entries,
    copy: { title: "Audit Log" },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(() => ({ title: "Audit Log", robots: "noindex" }));

export default function AuditPage({
  data,
}: {
  data: {
    user: SaasContextUser;
    entries: AuditEntry[];
    copy: { title: string };
    i18n: I18nClientPayload;
  };
}) {
  return (
    <DashboardShell i18n={data.i18n} user={data.user}>
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold">{data.copy.title}</h1>
        <ul class="divide-y divide-border rounded-lg border border-border">
          {data.entries.map((entry) => (
            <li class="p-4 text-sm" key={entry.id}>
              <p class="font-medium">{entry.action}</p>
              <p class="text-muted-foreground">
                {entry.resource.type}/{entry.resource.id} · {entry.occurredAt}
              </p>
            </li>
          ))}
          {data.entries.length === 0 && (
            <li class="p-4 text-sm text-muted-foreground">No audit events yet.</li>
          )}
        </ul>
      </div>
    </DashboardShell>
  );
}
