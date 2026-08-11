import { AppShell } from "../../components/app-shell.js";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect, type OtokPageProps } from "otok/server";
import { defineAction as defineDbAction } from "@kamod-ch/otok-kysely/loader";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";
import { findValidInvitation, acceptInvitation } from "../../../lib/invites.js";
import { setActiveOrgCookie, countOrgMembers } from "../../../lib/tenant.js";
import { canInviteMore } from "../../../lib/permissions.js";
import { getOrgPlan } from "../../../lib/billing-adapter.js";
import { getAuditRuntime } from "@kamod-ch/otok-audit";
import type { SaasDatabase } from "../../../db/types.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineLoader(async ({ params, db, hono }: any) => {
  const token = String(params.token ?? "");
  const invite = await findValidInvitation(db as import("kysely").Kysely<SaasDatabase>, token);
  if (!invite) {
    return { invalid: true as const, i18n: serializeI18n(hono) };
  }

  const runtime = tryGetAuthRuntime();
  let user = null;
  if (runtime) {
    user = await authFromOtokContext(hono, runtime.helpers).getSession();
  }

  return {
    invalid: false as const,
    invite,
    user,
    token,
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(() => ({ title: "Accept invitation", robots: "noindex" }));

export const action = defineDbAction(async ({ params, db, hono, formData }) => {
  const token = String(params.token ?? "");
  const invite = await findValidInvitation(db as import("kysely").Kysely<SaasDatabase>, token);
  if (!invite) return { message: "Invitation expired or invalid" };

  const runtime = getAuthRuntime();
  const user = await authFromOtokContext(hono, runtime.helpers).requireUser();
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { message: "Sign in with the invited email address" };
  }

  const plan = await getOrgPlan(db as import("kysely").Kysely<SaasDatabase>, invite.org_id);
  const members = await countOrgMembers(db as import("kysely").Kysely<SaasDatabase>, invite.org_id);
  if (!canInviteMore(plan, members)) {
    return { message: "Organization member limit reached" };
  }

  await acceptInvitation(
    db as import("kysely").Kysely<SaasDatabase>,
    invite.id,
    user.id,
    invite.role,
    invite.org_id,
  );

  await getAuditRuntime().record({
    tenantId: invite.org_id,
    actor: { id: user.id, type: "user", email: user.email },
    action: "team.invite_accepted",
    resource: { type: "invitation", id: invite.id, name: invite.email },
  });

  setActiveOrgCookie(hono, invite.org_id);
  redirect("/dashboard", 303);
});

export default function InvitePage({ data }: OtokPageProps<any>) {
  if (data.invalid) {
    return (
      <AppShell title="Invitation" i18n={data.i18n}>
        <p class="p-8 text-center text-muted-foreground">This invitation is invalid or expired.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Invitation" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-md space-y-6 px-6 py-16 text-center">
        <h1 class="text-2xl font-semibold">Join {data.invite.org_name}</h1>
        <p class="text-muted-foreground">
          You were invited as <strong>{data.invite.role}</strong> ({data.invite.email})
        </p>
        {data.user ? (
          <form method="post">
            <Button type="submit">Accept invitation</Button>
          </form>
        ) : (
          <div class="flex flex-col gap-3">
            <Button asChild>
              <a href={`/register?email=${encodeURIComponent(data.invite.email)}`}>Create account</a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/login?next=/invite/${data.token}`}>Sign in</a>
            </Button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
