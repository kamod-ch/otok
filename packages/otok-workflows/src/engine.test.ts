import { describe, expect, it } from "vitest";
import { defineWorkflow, z } from "./define-workflow.js";
import { WorkflowEngine } from "./engine.js";
import { createMemoryWorkflowStore } from "./providers/memory.js";
import { isWaitingApproval } from "./errors.js";

const manualStart = { autoExecute: false as const };

describe("step durability", () => {
  it("does not re-execute completed steps after crash", async () => {
    let stepACalls = 0;
    let stepBCalls = 0;

    const workflow = defineWorkflow({
      name: "crash.test",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("step-a", () => {
          stepACalls++;
          return "result-a";
        });
        await step.run(
          "step-b",
          () => {
            stepBCalls++;
            if (stepBCalls === 1) throw new Error("simulated crash");
            return "result-b";
          },
          { retry: { maxAttempts: 1 } },
        );
        return { ok: true };
      },
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);

    const instance = await engine.start(workflow, {}, manualStart);
    await expect(engine.execute(instance.id)).rejects.toThrow("simulated crash");
    expect(stepACalls).toBe(1);
    expect(stepBCalls).toBe(1);

    await engine.execute(instance.id);
    expect(stepACalls).toBe(1);
    expect(stepBCalls).toBe(2);

    const final = await engine.getStatus(instance.id);
    expect(final?.status).toBe("completed");
  });
});

describe("idempotency", () => {
  it("returns same instance for duplicate idempotency key", async () => {
    const workflow = defineWorkflow({
      name: "idempotent.test",
      input: z.object({ id: z.string() }),
      run: async () => ({ ok: true }),
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);

    const a = await engine.start(workflow, { id: "1" }, { idempotencyKey: "key-1", ...manualStart });
    const b = await engine.start(workflow, { id: "2" }, { idempotencyKey: "key-1", ...manualStart });
    expect(a.id).toBe(b.id);
  });
});

describe("cancel and resume", () => {
  it("cancels a delayed workflow before execution", async () => {
    const workflow = defineWorkflow({
      name: "cancel.test",
      input: z.object({}),
      run: async () => ({ ok: true }),
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);
    const instance = await engine.start(workflow, {}, { delayMs: 60_000, autoExecute: false });

    await engine.cancel(instance.id);
    const status = await engine.getStatus(instance.id);
    expect(status?.status).toBe("cancelled");
  });

  it("waits for approval and resumes", async () => {
    const workflow = defineWorkflow({
      name: "approval.test",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("prepare", () => "ready");
        await step.waitForApproval("manager-approval");
        return { approved: true };
      },
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);
    const instance = await engine.start(workflow, {}, manualStart);

    try {
      await engine.execute(instance.id);
    } catch (error) {
      expect(isWaitingApproval(error)).toBe(true);
    }

    let status = await engine.getStatus(instance.id);
    expect(status?.status).toBe("waiting_approval");

    await engine.resume(instance.id);
    status = await engine.getStatus(instance.id);
    expect(status?.status).toBe("completed");
  });
});

describe("parallel steps", () => {
  it("runs parallel sub-steps durably", async () => {
    let aCalls = 0;
    let bCalls = 0;

    const workflow = defineWorkflow({
      name: "parallel.test",
      input: z.object({}),
      run: async ({ step }) => {
        const result = await step.parallel("fetch", {
          a: () => { aCalls++; return "A"; },
          b: () => { bCalls++; return "B"; },
        });
        return result;
      },
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);
    const instance = await engine.start(workflow, {}, manualStart);
    await engine.execute(instance.id);

    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);

    await engine.execute(instance.id);
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });
});

describe("retry", () => {
  it("retries failed steps with backoff", async () => {
    let attempts = 0;

    const workflow = defineWorkflow({
      name: "retry.test",
      input: z.object({}),
      retry: { maxAttempts: 3, initialDelayMs: 1 },
      run: async ({ step }) => {
        await step.run("flaky", () => {
          attempts++;
          if (attempts < 3) throw new Error("fail");
          return "ok";
        });
        return { ok: true };
      },
    });

    const engine = new WorkflowEngine({ store: createMemoryWorkflowStore() });
    engine.register(workflow);
    const instance = await engine.start(workflow, {}, manualStart);
    await engine.execute(instance.id);
    expect(attempts).toBe(3);
  });
});
