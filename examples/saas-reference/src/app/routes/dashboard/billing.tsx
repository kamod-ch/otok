import { DashboardShell } from "../../components/dashboard-shell.js";
import { defineSaasSchemaAction, defineSaasLoader, requirePermission } from "../../../lib/saas-loader.js";
import { serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { redirect } from "otok/server";
import { FormActions, FormAlert, readFormFailure } from "@kamod-ch/otok-kamod/forms";
import { checkoutSchema } from "../../../schemas/billing.js";
import { stripeBillingStatusAction, stripeCheckoutAction } from "@kamod-ch/otok-stripe";
import { createBillingAdapter } from "../../../lib/billing-adapter.js";
import { recordAudit } from "../../../lib/audit.js";
import { can } from "../../../lib/permissions.js";
import { Button } from "@kamod-ch/ui/button";

const PRICE_IDS: Record<"pro" | "team", string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro_test",
  team: process.env.STRIPE_PRICE_TEAM ?? "price_team_test",
};

export const loader = defineSaasLoader(async ({ user, db, hono }) => {
  requirePermission(user, "billing:read");
  const adapter = createBillingAdapter(db);
  const status = await stripeBillingStatusAction(adapter, user.orgId);
  return {
    user,
    status,
    canManage: can(user.orgRole, user.plan, "billing:manage"),
    copy: {
      title: "Billing",
      checkout: "Choose plan",
      portal: "Customer portal",
    },
    i18n: serializeI18n(hono),
  };
});

export const head = defineMeta(() => ({ title: "Billing", robots: "noindex" }));

export const action = defineSaasSchemaAction({
  schema: checkoutSchema,
  handler: async ({ input, user }) => {
    requirePermission(user, "billing:manage");
    const appUrl = process.env.APP_URL ?? "http://localhost:5173";
    const checkout = await stripeCheckoutAction({
      plan: input.plan,
      priceId: PRICE_IDS[input.plan],
      workspaceId: user.orgId,
      userId: user.id,
      customerEmail: user.email,
      successUrl: `${appUrl}/dashboard/billing?success=1`,
      cancelUrl: `${appUrl}/dashboard/billing?canceled=1`,
      metadata: { workspaceId: user.orgId, plan: input.plan },
    });

    await recordAudit(user, {
      action: "billing.checkout_started",
      resourceType: "billing",
      resourceId: user.orgId,
      metadata: { plan: input.plan, sessionId: checkout.sessionId },
    });

    redirect(checkout.url, 303);
  },
});

export default function BillingPage({
  data,
  actionData,
}: {
  data: {
    user: import("../../../db/types.js").SaasContextUser;
    status: any;
    canManage: boolean;
    copy: { title: string; checkout: string; portal: string };
    i18n: import("@kamod-ch/otok-i18n").I18nClientPayload;
  };
  actionData?: unknown;
}) {
  const failure = readFormFailure(actionData);

  return (
    <DashboardShell i18n={data.i18n} user={data.user}>
      <div class="space-y-8">
        <h1 class="text-2xl font-semibold">{data.copy.title}</h1>
        <FormAlert message={failure?.message} />

        <dl class="grid gap-4 rounded-lg border border-border p-6 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted-foreground">Current plan</dt>
            <dd class="text-xl font-semibold">{data.status?.plan ?? data.user.plan}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Subscription</dt>
            <dd class="text-xl font-semibold">{data.status?.status ?? "none"}</dd>
          </div>
        </dl>

        {data.canManage && (
          <div class="flex flex-wrap gap-4">
            <form method="post" class="rounded-lg border border-border p-4">
              <input type="hidden" name="plan" value="pro" />
              <p class="mb-3 font-medium">Pro — up to 5 members</p>
              <FormActions submitLabel={`${data.copy.checkout}: Pro`} />
            </form>
            <form method="post" class="rounded-lg border border-border p-4">
              <input type="hidden" name="plan" value="team" />
              <p class="mb-3 font-medium">Team — unlimited members</p>
              <FormActions submitLabel={`${data.copy.checkout}: Team`} />
            </form>
            {data.status?.stripeCustomerId && (
              <Button asChild variant="outline">
                <a href="/dashboard/billing/portal">{data.copy.portal}</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
