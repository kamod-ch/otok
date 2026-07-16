import type Stripe from "stripe";
import type { CheckoutSessionInput, CheckoutSessionResult } from "./types.js";

export async function createCheckoutSession<TPlan extends string = string>(
  stripe: Stripe,
  input: CheckoutSessionInput<TPlan>,
): Promise<CheckoutSessionResult> {
  if (!input.priceId) throw new Error("createCheckoutSession requires priceId");
  if (!input.workspaceId) throw new Error("createCheckoutSession requires workspaceId");
  if (!input.userId) throw new Error("createCheckoutSession requires userId");
  if (!input.successUrl) throw new Error("createCheckoutSession requires successUrl");
  if (!input.cancelUrl) throw new Error("createCheckoutSession requires cancelUrl");

  const mode = input.mode ?? "subscription";
  const quantity = input.quantity ?? 1;

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: input.priceId, quantity }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    client_reference_id: input.workspaceId,
    metadata: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      plan: input.plan,
      ...input.metadata,
    },
    subscription_data:
      mode === "subscription"
        ? {
            metadata: {
              workspaceId: input.workspaceId,
              userId: input.userId,
              plan: input.plan,
            },
          }
        : undefined,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session was created without a URL");
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}
