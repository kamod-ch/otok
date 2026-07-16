import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type Stripe from "stripe";
import type { BillingAdapter } from "./adapter/types.js";
import type { BillingRecord } from "./types.js";
import {
  dispatchStripeEvent,
  handleCheckoutCompleted,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "./webhook/events.js";
import { createStripeWebhookHandler } from "./webhook/middleware.js";

type Plan = "free" | "launch" | "pro";

function createMemoryAdapter(): BillingAdapter<Plan> & { records: Map<string, BillingRecord<Plan>> } {
  const records = new Map<string, BillingRecord<Plan>>();
  return {
    records,
    freePlan: "free",
    async getRecord(workspaceId) {
      return records.get(workspaceId) ?? null;
    },
    async upsertRecord(record) {
      records.set(record.workspaceId, record);
    },
    resolvePlanFromPriceId(priceId) {
      if (priceId === "price_launch") return "launch";
      if (priceId === "price_pro") return "pro";
      return null;
    },
  };
}

describe("webhook event handlers", () => {
  it("upserts plan on checkout.session.completed", async () => {
    const adapter = createMemoryAdapter();
    const session = {
      metadata: { workspaceId: "ws_1", plan: "launch", userId: "u_1" },
      client_reference_id: "ws_1",
      customer: "cus_1",
      subscription: "sub_1",
    } as unknown as Stripe.Checkout.Session;

    const record = await handleCheckoutCompleted(adapter, session);
    expect(record).toMatchObject({
      workspaceId: "ws_1",
      plan: "launch",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
    expect(await adapter.getRecord("ws_1")).toMatchObject({ plan: "launch" });
  });

  it("syncs plan from price id on subscription.updated", async () => {
    const adapter = createMemoryAdapter();
    const subscription = {
      id: "sub_2",
      status: "active",
      metadata: { workspaceId: "ws_2" },
      customer: "cus_2",
      items: { data: [{ price: { id: "price_pro" } }] },
    } as unknown as Stripe.Subscription;

    const record = await handleSubscriptionUpdated(adapter, subscription);
    expect(record?.plan).toBe("pro");
  });

  it("downgrades to free on subscription.deleted", async () => {
    const adapter = createMemoryAdapter();
    await adapter.upsertRecord({
      workspaceId: "ws_3",
      plan: "pro",
      stripeCustomerId: "cus_3",
      stripeSubscriptionId: "sub_3",
      updatedAt: new Date().toISOString(),
    });

    const subscription = {
      id: "sub_3",
      metadata: { workspaceId: "ws_3" },
      customer: "cus_3",
    } as unknown as Stripe.Subscription;

    const record = await handleSubscriptionDeleted(adapter, subscription);
    expect(record?.plan).toBe("free");
    expect(record?.stripeSubscriptionId).toBeNull();
  });

  it("dispatches known event types and ignores others", async () => {
    const adapter = createMemoryAdapter();
    const completed = await dispatchStripeEvent(adapter, {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { workspaceId: "ws_4", plan: "launch" },
          customer: "cus_4",
          subscription: "sub_4",
        },
      },
    } as unknown as Stripe.Event);
    expect(completed?.plan).toBe("launch");

    const ignored = await dispatchStripeEvent(adapter, {
      type: "charge.succeeded",
      data: { object: {} },
    } as unknown as Stripe.Event);
    expect(ignored).toBeNull();
  });
});

describe("createStripeWebhookHandler", () => {
  it("rejects missing signature", async () => {
    const adapter = createMemoryAdapter();
    const stripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
    } as unknown as Stripe;

    const app = new Hono();
    app.post("/webhook", createStripeWebhookHandler({ stripe, webhookSecret: "whsec_test", adapter }));

    const response = await app.request("/webhook", { method: "POST", body: "{}" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "missing_signature" } });
  });

  it("rejects invalid signature", async () => {
    const adapter = createMemoryAdapter();
    const stripe = {
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad sig");
        }),
      },
    } as unknown as Stripe;

    const app = new Hono();
    app.post("/webhook", createStripeWebhookHandler({ stripe, webhookSecret: "whsec_test", adapter }));

    const response = await app.request("/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=bad" },
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_signature" } });
  });

  it("processes a valid event and returns received", async () => {
    const adapter = createMemoryAdapter();
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { workspaceId: "ws_5", plan: "pro" },
          customer: "cus_5",
          subscription: "sub_5",
        },
      },
    } as unknown as Stripe.Event;

    const stripe = {
      webhooks: {
        constructEvent: vi.fn(() => event),
      },
    } as unknown as Stripe;

    const onRecord = vi.fn();
    const app = new Hono();
    app.post(
      "/webhook",
      createStripeWebhookHandler({
        stripe,
        webhookSecret: "whsec_test",
        adapter,
        onRecord,
      }),
    );

    const response = await app.request("/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=ok" },
      body: JSON.stringify({ id: "evt_1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(await adapter.getRecord("ws_5")).toMatchObject({ plan: "pro" });
    expect(onRecord).toHaveBeenCalledOnce();
  });
});
