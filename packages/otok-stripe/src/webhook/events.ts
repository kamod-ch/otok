import type Stripe from "stripe";
import type { BillingAdapter } from "../adapter/types.js";
import type { BillingRecord } from "../types.js";

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function subscriptionId(value: string | Stripe.Subscription | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function handleCheckoutCompleted<TPlan extends string>(
  adapter: BillingAdapter<TPlan>,
  session: Stripe.Checkout.Session,
): Promise<BillingRecord<TPlan> | null> {
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? null;
  const plan = session.metadata?.plan as TPlan | undefined;
  if (!workspaceId || !plan) return null;

  const record: BillingRecord<TPlan> = {
    workspaceId,
    plan,
    stripeCustomerId: customerId(session.customer),
    stripeSubscriptionId: subscriptionId(session.subscription),
    updatedAt: new Date().toISOString(),
  };
  await adapter.upsertRecord(record);
  return record;
}

export async function handleSubscriptionUpdated<TPlan extends string>(
  adapter: BillingAdapter<TPlan>,
  subscription: Stripe.Subscription,
): Promise<BillingRecord<TPlan> | null> {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) return null;

  const priceId = subscription.items.data[0]?.price?.id;
  let plan = (subscription.metadata?.plan as TPlan | undefined) ?? undefined;
  if (!plan && priceId && adapter.resolvePlanFromPriceId) {
    plan = adapter.resolvePlanFromPriceId(priceId) ?? undefined;
  }
  if (!plan) {
    const existing = await adapter.getRecord(workspaceId);
    plan = existing?.plan;
  }
  if (!plan) return null;

  const active =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";

  const freePlan = (adapter.freePlan ?? ("free" as TPlan)) as TPlan;
  const record: BillingRecord<TPlan> = {
    workspaceId,
    plan: active ? plan : freePlan,
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    updatedAt: new Date().toISOString(),
  };
  await adapter.upsertRecord(record);
  return record;
}

export async function handleSubscriptionDeleted<TPlan extends string>(
  adapter: BillingAdapter<TPlan>,
  subscription: Stripe.Subscription,
): Promise<BillingRecord<TPlan> | null> {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) return null;

  const freePlan = (adapter.freePlan ?? ("free" as TPlan)) as TPlan;
  const record: BillingRecord<TPlan> = {
    workspaceId,
    plan: freePlan,
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: null,
    updatedAt: new Date().toISOString(),
  };
  await adapter.upsertRecord(record);
  return record;
}

export async function dispatchStripeEvent<TPlan extends string>(
  adapter: BillingAdapter<TPlan>,
  event: Stripe.Event,
): Promise<BillingRecord<TPlan> | null> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(adapter, event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(adapter, event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(adapter, event.data.object as Stripe.Subscription);
    default:
      return null;
  }
}
