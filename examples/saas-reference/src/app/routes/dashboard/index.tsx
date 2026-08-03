import { DashboardShell } from "../../components/dashboard-shell.js";
import { defineSaasLoader } from "../../../lib/saas-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { countOrgMembers } from "../../../lib/tenant.js";
import { memberLimitForPlan } from "../../../lib/permissions.js";

export const loader = defineSaasLoader(async ({ user, db, hono }) => {
  const members = await countOrgMembers(db, user.orgId);
  const limit = memberLimitForPlan(user.plan);
  return {
    user,
    members,
    limit,
    copy: {
      title: "Dashboard",
      welcome: `Signed in as ${user.email} · ${user.orgName}`,
    },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(() => ({ title: "Dashboard", robots: "noindex" }));

export default function DashboardPage({
  data,
}: {
  data: {
    user: import("../../../db/types.js").SaasContextUser;
    members: number;
    limit: number | null;
    copy: { title: string; welcome: string };
    i18n: import("@kamod-ch/otok-i18n").I18nClientPayload;
  };
}) {
  return (
    <DashboardShell i18n={data.i18n} user={data.user}>
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold">{data.copy.title}</h1>
        <p class="text-muted-foreground">{data.copy.welcome}</p>
        <dl class="grid gap-4 rounded-lg border border-border p-6 sm:grid-cols-3">
          <div>
            <dt class="text-sm text-muted-foreground">Plan</dt>
            <dd class="text-lg font-medium">{data.user.plan}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Role</dt>
            <dd class="text-lg font-medium">{data.user.orgRole}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Team</dt>
            <dd class="text-lg font-medium">
              {data.members}
              {data.limit !== null ? ` / ${data.limit}` : ""}
            </dd>
          </div>
        </dl>
      </div>
    </DashboardShell>
  );
}
