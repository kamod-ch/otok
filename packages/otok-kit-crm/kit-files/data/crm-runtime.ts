import { CrmService, seedSwissDemo, SWISS_DEMO_ORG_ID } from "@kamod-ch/otok-kit-crm";

const service = new CrmService();
seedSwissDemo(service);

export function getKitCrm() {
  return service;
}

export { SWISS_DEMO_ORG_ID };
