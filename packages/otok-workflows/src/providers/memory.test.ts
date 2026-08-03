import { describe, expect, it } from "vitest";
import { MemoryWorkflowStore, createMemoryWorkflowStore } from "../providers/memory.js";
import { WorkflowEngine } from "../engine.js";
import { defineWorkflow, z } from "../define-workflow.js";

describe("MemoryWorkflowStore transaction test", () => {
  it("persists steps across engine instances (simulated restart)", async () => {
    const store = createMemoryWorkflowStore();
    let calls = 0;

    const workflow = defineWorkflow({
      name: "persist.test",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("work", () => {
          calls++;
          return calls;
        });
        return { calls };
      },
    });

    const engine1 = new WorkflowEngine({ store });
    engine1.register(workflow);
    const instance = await engine1.start(workflow, {}, { autoExecute: false });
    await engine1.execute(instance.id);
    expect(calls).toBe(1);

    const engine2 = new WorkflowEngine({ store });
    engine2.register(workflow);
    await engine2.execute(instance.id);
    expect(calls).toBe(1);
  });
});

export { MemoryWorkflowStore };
