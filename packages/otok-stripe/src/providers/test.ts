import type Stripe from "stripe";
import type { BillingPortalSessionInput, BillingPortalSessionResult } from "../portal.js";
import type { CheckoutSessionInput, CheckoutSessionResult } from "../types.js";
import type { StripeProvider } from "../provider/types.js";

interface TestCheckoutSession extends CheckoutSessionResult {
  metadata: Record<string, string>;
}

const checkoutSessions = new Map<string, TestCheckoutSession>();
const processedEvents = new Set<string>();

/** @internal Test helper */
export function resetTestStripeProvider(): void {
  checkoutSessions.clear();
  processedEvents.clear();
}

export function getTestCheckoutSessions(): readonly TestCheckoutSession[] {
  return [...checkoutSessions.values()];
}

export function createTestStripeProvider<TPlan extends string = string>(): StripeProvider<TPlan> {
  const client = {
    apiKey: "sk_test_otok",
    webhooks: {
      constructEvent(rawBody: string, signature: string, _secret: string): Stripe.Event {
        if (!signature.startsWith("t=")) {
          throw new Error("invalid signature");
        }
        return JSON.parse(rawBody) as Stripe.Event;
      },
    },
  } as unknown as Stripe;

  return {
    name: "test",
    capabilities: {
      checkout: true,
      portal: true,
      webhooks: true,
      liveMode: false,
    },
    client,
    async createCheckoutSession(input: CheckoutSessionInput<TPlan>): Promise<CheckoutSessionResult> {
      if (!input.priceId) throw new Error("createCheckoutSession requires priceId");
      const sessionId = `cs_test_${checkoutSessions.size + 1}`;
      const result: TestCheckoutSession = {
        sessionId,
        url: `https://checkout.test/${sessionId}`,
        metadata: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          plan: input.plan,
        },
      };
      checkoutSessions.set(sessionId, result);
      return { sessionId: result.sessionId, url: result.url };
    },
    async createBillingPortalSession(input: BillingPortalSessionInput): Promise<BillingPortalSessionResult> {
      if (!input.customerId) throw new Error("createBillingPortalSession requires customerId");
      return { url: `https://portal.test/${input.customerId}` };
    },
    constructWebhookEvent(rawBody, signature, _secret) {
      if (!signature.startsWith("t=")) {
        throw new Error("invalid signature");
      }
      return JSON.parse(rawBody) as Stripe.Event;
    },
  };
}

export function markTestStripeEventProcessed(eventId: string): boolean {
  if (processedEvents.has(eventId)) return false;
  processedEvents.add(eventId);
  return true;
}

export function isTestStripeEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}
