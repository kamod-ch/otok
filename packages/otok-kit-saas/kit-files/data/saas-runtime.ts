import { MemoryBillingStore, createMemoryEventIdempotencyStore } from "@kamod-ch/otok-kit-saas";

const billing = new MemoryBillingStore();
const webhookEvents = createMemoryEventIdempotencyStore();

export function getSaasBilling() {
  return billing;
}

export function getSaasWebhookStore() {
  return webhookEvents;
}

export const DEMO_WORKSPACE_ID = "ws-demo";
