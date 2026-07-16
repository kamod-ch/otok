import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { createCheckoutSession } from "./checkout.js";
import type { BillingAdapter } from "./adapter/types.js";
import type { BillingRecord } from "./types.js";

function createMockStripe(createImpl: (params: Stripe.Checkout.SessionCreateParams) => Promise<Stripe.Checkout.Session>) {
  return {
    checkout: {
      sessions: {
        create: vi.fn(createImpl),
      },
    },
  } as unknown as Stripe;
}

describe("createCheckoutSession", () => {
  it("creates a subscription checkout session with metadata", async () => {
    const stripe = createMockStripe(async (params) => {
      expect(params.mode).toBe("subscription");
      expect(params.line_items).toEqual([{ price: "price_launch", quantity: 1 }]);
      expect(params.metadata).toEqual({
        workspaceId: "ws_1",
        userId: "user_1",
        plan: "launch",
      });
      expect(params.customer_email).toBe("hr@example.com");
      expect(params.subscription_data?.metadata).toEqual({
        workspaceId: "ws_1",
        userId: "user_1",
        plan: "launch",
      });
      return {
        id: "cs_test_1",
        url: "https://checkout.stripe.com/c/pay/cs_test_1",
      } as Stripe.Checkout.Session;
    });

    const result = await createCheckoutSession(stripe, {
      plan: "launch",
      priceId: "price_launch",
      workspaceId: "ws_1",
      userId: "user_1",
      customerEmail: "hr@example.com",
      successUrl: "https://app.test/success",
      cancelUrl: "https://app.test/cancel",
    });

    expect(result).toEqual({
      sessionId: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
  });

  it("rejects missing required fields", async () => {
    const stripe = createMockStripe(async () => {
      throw new Error("should not be called");
    });

    await expect(
      createCheckoutSession(stripe, {
        plan: "launch",
        priceId: "",
        workspaceId: "ws_1",
        userId: "user_1",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toThrow("priceId");
  });

  it("throws when Stripe returns no URL", async () => {
    const stripe = createMockStripe(async () => ({ id: "cs_test_2", url: null }) as Stripe.Checkout.Session);

    await expect(
      createCheckoutSession(stripe, {
        plan: "pro",
        priceId: "price_pro",
        workspaceId: "ws_1",
        userId: "user_1",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toThrow("without a URL");
  });
});

describe("BillingAdapter contract", () => {
  it("stores and retrieves records", async () => {
    const records = new Map<string, BillingRecord<"free" | "launch" | "pro">>();
    const adapter: BillingAdapter<"free" | "launch" | "pro"> = {
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

    await adapter.upsertRecord({
      workspaceId: "ws_1",
      plan: "launch",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(await adapter.getRecord("ws_1")).toMatchObject({ plan: "launch", stripeCustomerId: "cus_1" });
    expect(adapter.resolvePlanFromPriceId?.("price_pro")).toBe("pro");
  });
});
