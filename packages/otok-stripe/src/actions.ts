import type { BillingAdapter } from "./adapter/types.js";
import type { BillingPortalSessionInput } from "./portal.js";
import type { CheckoutSessionInput } from "./types.js";
import {
  toBillingPortalSessionDto,
  toBillingStatusDto,
  toCheckoutSessionDto,
  type BillingPortalSessionDto,
  type BillingStatusDto,
  type CheckoutSessionDto,
  type SubscriptionStatus,
} from "./dto.js";
import { getStripeProvider } from "./registry.js";
import { resolveSubscriptionStatus } from "./idempotency.js";

export async function stripeCheckoutAction<TPlan extends string>(
  input: CheckoutSessionInput<TPlan>,
): Promise<CheckoutSessionDto> {
  const provider = getStripeProvider<TPlan>();
  const result = await provider.createCheckoutSession(input);
  return toCheckoutSessionDto(result);
}

export async function stripePortalAction(input: BillingPortalSessionInput): Promise<BillingPortalSessionDto> {
  const provider = getStripeProvider();
  const result = await provider.createBillingPortalSession(input);
  return toBillingPortalSessionDto(result);
}

export async function stripeBillingStatusAction<TPlan extends string>(
  adapter: BillingAdapter<TPlan>,
  workspaceId: string,
  stripeStatus?: SubscriptionStatus | string | null,
): Promise<BillingStatusDto<TPlan> | null> {
  const record = await adapter.getRecord(workspaceId);
  const status = resolveSubscriptionStatus(record, stripeStatus ?? null);
  return toBillingStatusDto(record, status);
}
