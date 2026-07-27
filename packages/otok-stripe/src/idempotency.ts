import type { BillingRecord } from "./types.js";
import type { SubscriptionStatus } from "./dto.js";

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

/** @internal Test helper */
export function resetMemoryEventIdempotencyStore(store: EventIdempotencyStore & { _reset?: () => void }) {
  if ("_reset" in store && typeof store._reset === "function") {
    store._reset();
  }
}

export function resolveSubscriptionStatus(
  record: BillingRecord | null,
  stripeStatus?: string | null,
): SubscriptionStatus {
  if (!record?.stripeSubscriptionId) return "none";
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing") return "trialing";
  if (stripeStatus === "past_due") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "unpaid") return "canceled";
  if (stripeStatus === "incomplete" || stripeStatus === "incomplete_expired") return "incomplete";
  return record.plan === "free" ? "none" : "active";
}

export async function processStripeEventIdempotently<T>(
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
