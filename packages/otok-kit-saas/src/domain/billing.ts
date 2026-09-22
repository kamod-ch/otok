export type SaasPlan = "free" | "launch" | "pro";

export type SubscriptionStatus = "none" | "active" | "trialing" | "past_due" | "canceled" | "incomplete";

export interface SaasBillingRecord {
  workspaceId: string;
  plan: SaasPlan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: SubscriptionStatus;
  updatedAt: string;
}

export interface SaasBillingAdapter {
  getRecord(workspaceId: string): Promise<SaasBillingRecord | null>;
  upsertRecord(record: SaasBillingRecord): Promise<void>;
  resolvePlanFromPriceId?(priceId: string): SaasPlan | null;
  freePlan?: SaasPlan;
}

const DEFAULT_PRICE_MAP: Record<string, SaasPlan> = {
  price_launch: "launch",
  price_pro: "pro",
};

export class MemoryBillingStore implements SaasBillingAdapter {
  readonly freePlan: SaasPlan = "free";
  private readonly records = new Map<string, SaasBillingRecord>();
  private readonly priceMap: Record<string, SaasPlan>;

  constructor(priceMap: Record<string, SaasPlan> = DEFAULT_PRICE_MAP) {
    this.priceMap = priceMap;
  }

  async getRecord(workspaceId: string): Promise<SaasBillingRecord | null> {
    return this.records.get(workspaceId) ?? null;
  }

  async upsertRecord(record: SaasBillingRecord): Promise<void> {
    this.records.set(record.workspaceId, record);
  }

  resolvePlanFromPriceId(priceId: string): SaasPlan | null {
    return this.priceMap[priceId] ?? null;
  }
}

export function createCheckoutIntent(input: {
  workspaceId: string;
  plan: Exclude<SaasPlan, "free">;
  successPath?: string;
  cancelPath?: string;
}): { plan: string; workspaceId: string; successUrl: string; cancelUrl: string } {
  return {
    plan: input.plan,
    workspaceId: input.workspaceId,
    successUrl: input.successPath ?? "/billing?checkout=success",
    cancelUrl: input.cancelPath ?? "/billing?checkout=cancel",
  };
}

export async function applyCheckoutCompleted(
  adapter: SaasBillingAdapter,
  session: {
    metadata?: Record<string, string> | null;
    client_reference_id?: string | null;
    customer?: string | { id: string } | null;
    subscription?: string | { id: string } | null;
  },
): Promise<SaasBillingRecord | null> {
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? null;
  const plan = session.metadata?.plan as SaasPlan | undefined;
  if (!workspaceId || !plan || plan === "free") return null;
  const record: SaasBillingRecord = {
    workspaceId,
    plan,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
    stripeSubscriptionId:
      typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null),
    status: "active",
    updatedAt: new Date().toISOString(),
  };
  await adapter.upsertRecord(record);
  return record;
}

export async function applySubscriptionDeleted(
  adapter: SaasBillingAdapter,
  subscription: { metadata?: Record<string, string> | null; customer?: string | { id: string } | null },
): Promise<SaasBillingRecord | null> {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) return null;
  const freePlan = adapter.freePlan ?? "free";
  const record: SaasBillingRecord = {
    workspaceId,
    plan: freePlan,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : (subscription.customer?.id ?? null),
    stripeSubscriptionId: null,
    status: "canceled",
    updatedAt: new Date().toISOString(),
  };
  await adapter.upsertRecord(record);
  return record;
}

export interface EventIdempotencyStore {
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export function createMemoryEventIdempotencyStore(): EventIdempotencyStore {
  const processed = new Set<string>();
  return {
    async hasProcessed(eventId) {
      return processed.has(eventId);
    },
    async markProcessed(eventId) {
      processed.add(eventId);
    },
  };
}

export async function processWebhookEventIdempotently<T>(
  store: EventIdempotencyStore,
  eventId: string,
  handler: () => Promise<T>,
): Promise<{ duplicate: boolean; result: T | null }> {
  if (await store.hasProcessed(eventId)) {
    return { duplicate: true, result: null };
  }
  const result = await handler();
  await store.markProcessed(eventId);
  return { duplicate: false, result };
}

export async function dispatchSaasStripeEvent(
  adapter: SaasBillingAdapter,
  event: { type: string; data: { object: Record<string, unknown> } },
): Promise<SaasBillingRecord | null> {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    return applyCheckoutCompleted(adapter, object as Parameters<typeof applyCheckoutCompleted>[1]);
  }
  if (event.type === "customer.subscription.deleted") {
    return applySubscriptionDeleted(adapter, object as Parameters<typeof applySubscriptionDeleted>[1]);
  }
  return null;
}
