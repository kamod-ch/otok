/**
 * CRM events example — company.created triggers activities, search, notifications.
 *
 * Run tests: pnpm --filter @kamod-ch/otok-events test
 */
import { createEventBus } from "@kamod-ch/otok-events";
import { companyCreated, registerCrmEventHandlers } from "@kamod-ch/otok-events/crm";

const activities: Array<{ id: string; companyId: string; note: string; createdAt: string }> = [];
const searchIndex = new Map<string, string>();
const notifications: string[] = [];

const bus = createEventBus();

registerCrmEventHandlers(bus, {
  activities: {
    add: (e) => activities.push(e),
    list: (companyId) => activities.filter((a) => a.companyId === companyId),
  },
  search: {
    indexCompany: (id, name) => searchIndex.set(id, name),
  },
  notifications: {
    push: (e) => notifications.push(e.message),
    all: () => notifications.map((message) => ({ companyId: "", channel: "in-app", message, recipientId: "" })),
  },
});

export async function createCompany(input: {
  companyId: string;
  name: string;
  industry: string;
  createdBy: string;
}) {
  await bus.publish(companyCreated, input, { correlationId: `create-${input.companyId}` });
  return {
    activities: activities.filter((a) => a.companyId === input.companyId),
    searchEntry: searchIndex.get(input.companyId),
    notifications,
  };
}
