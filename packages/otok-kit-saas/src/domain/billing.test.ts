import { describe, expect, it } from "vitest";
import {
  MemoryBillingStore,
  applyCheckoutCompleted,
  createCheckoutIntent,
  createMemoryEventIdempotencyStore,
  dispatchSaasStripeEvent,
  processWebhookEventIdempotently,
} from "./billing.js";
import { hasSaasPermission } from "../permissions.js";
import kit from "../kit.js";

describe("saas billing domain", () => {
  it("creates a checkout intent for paid plans", () => {
    const intent = createCheckoutIntent({ workspaceId: "ws-1", plan: "pro" });
    expect(intent.plan).toBe("pro");
    expect(intent.successUrl).toContain("checkout=success");
  });

  it("upserts billing after checkout.session.completed", async () => {
    const store = new MemoryBillingStore();
    const record = await applyCheckoutCompleted(store, {
      metadata: { workspaceId: "ws-1", plan: "launch" },
      customer: "cus_1",
      subscription: "sub_1",
    });
    expect(record?.plan).toBe("launch");
    expect(record?.status).toBe("active");
    expect(await store.getRecord("ws-1")).toEqual(record);
  });

  it("processes webhooks idempotently", async () => {
    const store = new MemoryBillingStore();
    const events = createMemoryEventIdempotencyStore();
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { workspaceId: "ws-2", plan: "pro" },
          customer: "cus_2",
          subscription: "sub_2",
        },
      },
    };
    const first = await processWebhookEventIdempotently(events, event.id, () => dispatchSaasStripeEvent(store, event));
    const second = await processWebhookEventIdempotently(events, event.id, () => dispatchSaasStripeEvent(store, event));
    expect(first.duplicate).toBe(false);
    expect(first.result?.plan).toBe("pro");
    expect(second.duplicate).toBe(true);
    expect(second.result).toBeNull();
  });

  it("checks billing permissions", () => {
    expect(hasSaasPermission(["saas:billing:read"], "saas:billing:read")).toBe(true);
    expect(hasSaasPermission(["saas:billing:read"], "saas:subscriptions:manage")).toBe(false);
    expect(hasSaasPermission(["saas:*"], "saas:billing:admin")).toBe(true);
  });
});

describe("saas kit manifest", () => {
  it("declares checkout, portal, webhook, and migration", () => {
    expect(kit.version).toBe("0.2.0");
    expect(kit.migrations?.[0]?.id).toBe("20260814120000_saas_billing");
    expect(kit.routes?.map((r) => r.to)).toEqual([
      "src/app/routes/billing/index.tsx",
      "src/app/routes/billing/portal.tsx",
      "src/app/routes/api/stripe/webhook.tsx",
    ]);
  });
});
