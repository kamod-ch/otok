import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import stripe, { configureStripeApp, resetStripeIdempotencyForTests } from "./plugin.js";
import { resetStripeRuntimeForTests } from "./registry.js";
import { resetTestStripeProvider } from "./providers/test.js";
import { stripeCheckoutAction } from "./actions.js";
import type { BillingAdapter } from "./adapter/types.js";
import { processStripeEventIdempotently, createMemoryEventIdempotencyStore } from "./idempotency.js";

type Plan = "free" | "launch";

function memoryAdapter(): BillingAdapter<Plan> {
  const records = new Map<string, { workspaceId: string; plan: Plan; updatedAt: string }>();
  return {
    freePlan: "free",
    async getRecord(workspaceId) {
      return records.get(workspaceId) ?? null;
    },
    async upsertRecord(record) {
      records.set(record.workspaceId, record);
    },
  };
}

describe("stripe plugin", () => {
  beforeEach(() => {
    resetStripeRuntimeForTests();
    resetTestStripeProvider();
    resetStripeIdempotencyForTests();
  });

  it("registers test provider runtime", async () => {
    const plugin = stripe<Plan>({
      provider: { type: "test" },
    });

    const app = new Hono();
    await plugin.configureApp?.({ app, root: process.cwd(), mode: "test", command: "serve", config: { plugins: [] }, userConfig: { plugins: [] } });

    const checkout = await stripeCheckoutAction({
      plan: "launch",
      priceId: "price_launch",
      workspaceId: "ws_1",
      userId: "u_1",
      successUrl: "https://app.test/success",
      cancelUrl: "https://app.test/cancel",
    });

    expect(checkout.url).toContain("https://checkout.test/");
    expect(checkout.sessionId).toMatch(/^cs_test_/);
  });

  it("deduplicates webhook events", async () => {
    const adapter = memoryAdapter();
    const app = new Hono();
    await configureStripeApp(
      app,
      {
        provider: { type: "test" },
        webhookSecret: "whsec_test",
      },
      adapter,
    );

    const body = JSON.stringify({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { workspaceId: "ws_1", plan: "launch" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });

    const requestInit = {
      method: "POST" as const,
      headers: { "stripe-signature": "t=1,v1=ok" },
      body,
    };

    const first = await app.request("/api/billing/webhook", requestInit);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, duplicate: false, updated: true });

    const second = await app.request("/api/billing/webhook", requestInit);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ received: true, duplicate: true, updated: false });
  });
});

describe("event idempotency store", () => {
  it("marks events as processed once", async () => {
    const store = createMemoryEventIdempotencyStore();
    const first = await processStripeEventIdempotently(store, "evt_1", async () => "ok");
    const second = await processStripeEventIdempotently(store, "evt_1", async () => "ok");
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
