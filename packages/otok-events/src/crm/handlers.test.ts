import { describe, expect, it } from "vitest";
import { createTestEventBus } from "../testing/test-bus.js";
import { companyCreated, registerCrmEventHandlers } from "./index.js";

describe("CRM event handlers", () => {
  it("company.created triggers activity, search, and notification", async () => {
    const testBus = createTestEventBus();
    const activities: Array<{ companyId: string; note: string }> = [];
    const search: string[] = [];
    const notifications: string[] = [];

    registerCrmEventHandlers(testBus.bus, {
      activities: {
        add: (e) => activities.push({ companyId: e.companyId, note: e.note }),
        list: () => [],
      },
      search: {
        indexCompany: (id, name) => search.push(`${id}:${name}`),
      },
      notifications: {
        push: (e) => notifications.push(e.message),
        all: () => [],
      },
    });

    await testBus.publish(companyCreated, {
      companyId: "acme",
      name: "Acme Corp",
      industry: "Manufacturing",
      createdBy: "user-1",
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(search).toContain("acme:Acme Corp");
    expect(activities.some((a) => a.note.includes("Acme Corp"))).toBe(true);
    expect(notifications.some((m) => m.includes("New company created"))).toBe(true);
  });
});
