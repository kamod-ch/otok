import { DashboardShell } from "../../components/dashboard-shell.js";
import { defineSaasSchemaAction, defineSaasLoader, requirePermission } from "../../../lib/saas-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { FormActions, FormAlert, FormField, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { inviteSchema } from "../../../schemas/invite.js";
import { createInvitation } from "../../../lib/invites.js";
import { canInviteMore, can as checkPermission } from "../../../lib/permissions.js";
import { countOrgMembers } from "../../../lib/tenant.js";
import { recordAudit } from "../../../lib/audit.js";
import { getMailClient } from "@kamod-ch/otok-mail";

export const loader = defineSaasLoader(async ({ user, db, hono }) => {
  requirePermission(user, "team:read");
  const members = await db
    .selectFrom("org_member")
    .innerJoin("app_user", "app_user.id", "org_member.user_id")
    .select(["app_user.email", "app_user.name", "org_member.role", "org_member.created_at"])
    .where("org_member.org_id", "=", user.orgId)
    .orderBy("org_member.created_at")
    .execute();

  const pending = await db
    .selectFrom("invitation")
    .select(["email", "role", "expires_at"])
    .where("org_id", "=", user.orgId)
    .where("accepted_at", "is", null)
    .where("expires_at", ">", new Date().toISOString())
    .execute();

  return {
    user,
    members,
    pending,
    canInvite: checkPermission(user.orgRole, user.plan, "team:invite"),
    copy: { title: "Team", invite: "Invite" },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(() => ({ title: "Team", robots: "noindex" }));

export const action = defineSaasSchemaAction({
  schema: inviteSchema,
  handler: async ({ input, user, db }) => {
    requirePermission(user, "team:invite");
    const members = await countOrgMembers(db, user.orgId);
    if (!canInviteMore(user.plan, members)) {
      return { message: "Member limit reached for current plan. Upgrade billing first." };
    }

    const invite = await createInvitation(db, {
      orgId: user.orgId,
      email: input.email,
      role: input.role,
      invitedBy: user.id,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:5173";
    const link = `${appUrl}/invite/${invite.token}`;

    await getMailClient().send({
      to: invite.email,
      subject: `Invitation to ${user.orgName}`,
      text: `You were invited to join ${user.orgName}.\n\nAccept: ${link}\n\nExpires: ${invite.expiresAt}`,
    });

    await recordAudit(user, {
      action: "team.invited",
      resourceType: "invitation",
      resourceId: invite.id,
      resourceName: invite.email,
      metadata: { role: input.role },
    });

    return { success: true, link };
  },
});

export default function TeamPage({
  data,
  actionData,
}: {
  data: {
    user: import("../../../db/types.js").SaasContextUser;
    members: Array<{ email: string; name: string | null; role: string }>;
    pending: Array<{ email: string; role: string }>;
    canInvite: boolean;
    copy: { title: string; invite: string };
    i18n: import("@kamod-ch/otok-i18n").I18nClientPayload;
  };
  actionData?: unknown;
}) {
  const failure = readFormFailure(actionData);
  const success = actionData && typeof actionData === "object" && "success" in actionData ? (actionData as { link?: string }) : null;

  return (
    <DashboardShell i18n={data.i18n} user={data.user}>
      <div class="space-y-8">
        <h1 class="text-2xl font-semibold">{data.copy.title}</h1>

        <section class="rounded-lg border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border text-left text-muted-foreground">
                <th class="p-3">Email</th>
                <th class="p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr class="border-b border-border" key={m.email}>
                  <td class="p-3">{m.name ?? m.email}</td>
                  <td class="p-3">{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.pending.length > 0 && (
          <section>
            <h2 class="mb-2 font-medium">Pending invitations</h2>
            <ul class="list-disc pl-5 text-sm text-muted-foreground">
              {data.pending.map((p) => (
                <li key={p.email}>
                  {p.email} ({p.role})
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.canInvite && (
          <form method="post" class="grid max-w-md gap-4 rounded-lg border border-border p-6">
            <FormAlert message={failure?.message} />
            {success?.link && (
              <p class="rounded-md bg-muted p-3 text-xs break-all">Dev invite link: {success.link}</p>
            )}
            <FormField name="email" label="Email" type="email" errors={failure?.fieldErrors?.email} required />
            <label class="grid gap-1 text-sm">
              <span>Role</span>
              <select name="role" class="rounded-md border border-input px-3 py-2">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <FormActions submitLabel={data.copy.invite} />
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
