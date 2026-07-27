import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { createBillingPortalSession } from "./portal.js";

function createMockStripe(
  createImpl: (params: Stripe.BillingPortal.SessionCreateParams) => Promise<Stripe.BillingPortal.Session>,
) {
  return {
    billingPortal: {
      sessions: {
        create: vi.fn(createImpl),
      },
    },
  } as unknown as Stripe;
}

describe("createBillingPortalSession", () => {
  it("creates a portal session for the customer", async () => {
    const stripe = createMockStripe(async (params) => {
      expect(params.customer).toBe("cus_1");
      expect(params.return_url).toBe("https://app.test/studio/abrechnung");
      return {
        id: "bps_1",
        url: "https://billing.stripe.com/session/test",
      } as Stripe.BillingPortal.Session;
    });

    const result = await createBillingPortalSession(stripe, {
      customerId: "cus_1",
      returnUrl: "https://app.test/studio/abrechnung",
    });

    expect(result).toEqual({ url: "https://billing.stripe.com/session/test" });
  });

  it("rejects missing customerId", async () => {
    const stripe = createMockStripe(async () => {
      throw new Error("should not be called");
    });

    await expect(
      createBillingPortalSession(stripe, {
        customerId: "",
        returnUrl: "https://app.test/return",
      }),
    ).rejects.toThrow("customerId");
  });

  it("throws when Stripe returns no URL", async () => {
    const stripe = createMockStripe(async () => ({ id: "bps_2", url: "" }) as Stripe.BillingPortal.Session);

    await expect(
      createBillingPortalSession(stripe, {
        customerId: "cus_1",
        returnUrl: "https://app.test/return",
      }),
    ).rejects.toThrow("without a URL");
  });
});
