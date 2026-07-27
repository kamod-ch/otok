import type Stripe from "stripe";

export interface BillingPortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export interface BillingPortalSessionResult {
  url: string;
}

export async function createBillingPortalSession(
  stripe: Stripe,
  input: BillingPortalSessionInput,
): Promise<BillingPortalSessionResult> {
  if (!input.customerId) throw new Error("createBillingPortalSession requires customerId");
  if (!input.returnUrl) throw new Error("createBillingPortalSession requires returnUrl");

  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });

  if (!session.url) {
    throw new Error("Stripe Billing Portal Session was created without a URL");
  }

  return { url: session.url };
}
