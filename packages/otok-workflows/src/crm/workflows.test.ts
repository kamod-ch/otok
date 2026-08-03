import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "../engine.js";
import { createMemoryWorkflowStore } from "../providers/memory.js";
import { enrichCompany } from "./workflows.js";

const manualStart = { autoExecute: false as const };

describe("CRM enrichCompany workflow", () => {
  it("runs full import → website → contacts → notify pipeline", async () => {
    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(enrichCompany);

    const instance = await engine.start(enrichCompany, {
      companyId: "acme",
      name: "Acme Corp",
      domain: "acme.com",
      notifyEmail: "team@example.com",
    }, manualStart);

    await engine.execute(instance.id);
    const status = await engine.getStatus(instance.id);

    expect(status?.status).toBe("completed");
    expect(status?.output).toMatchObject({
      website: "https://acme.com",
      notified: true,
    });
    expect((status?.output as { contacts: unknown[] }).contacts.length).toBeGreaterThan(0);
  });

  it("replays without duplicate side effects after crash mid-workflow", async () => {
    let importCalls = 0;
    let notifyCalls = 0;

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    const crashingWorkflow = {
      ...enrichCompany,
      run: async (ctx: Parameters<typeof enrichCompany.run>[0]) => {
        await ctx.step.run("import-company", () => {
          importCalls++;
          return { imported: true };
        });
        await ctx.step.run("find-website", () => "https://acme.com");
        await ctx.step.run("find-contacts", () => [{ name: "A", email: "a@acme.com" }]);
        await ctx.step.run(
          "notify-team",
          () => {
            notifyCalls++;
            if (notifyCalls === 1) throw new Error("notify failed");
            return true;
          },
          { retry: { maxAttempts: 1 } },
        );
        return { website: "https://acme.com", contacts: [], notified: true };
      },
    };
    engine.register(crashingWorkflow);

    const instance = await engine.start(crashingWorkflow, {
      companyId: "acme",
      name: "Acme",
    }, manualStart);

    await expect(engine.execute(instance.id)).rejects.toThrow("notify failed");
    expect(importCalls).toBe(1);
    expect(notifyCalls).toBe(1);

    await engine.execute(instance.id);
    expect(importCalls).toBe(1);
    expect(notifyCalls).toBe(2);
  });
});
