import { defineSaasLoader, requirePermission } from "../../../../lib/saas-loader.js";
import { createBillingAdapter } from "../../../../lib/billing-adapter.js";
import { stripePortalAction } from "@kamod-ch/otok-stripe";
import { redirect } from "otok/server";

export const loader = defineSaasLoader(async ({ user, db }) => {
  requirePermission(user, "billing:manage");
  const adapter = createBillingAdapter(db);
  const record = await adapter.getRecord(user.orgId);
  if (!record?.stripeCustomerId) {
    redirect("/dashboard/billing", 303);
  }
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const portal = await stripePortalAction({
    customerId: record.stripeCustomerId!,
    returnUrl: `${appUrl}/dashboard/billing`,
  });
  redirect(portal.url, 303);
});
