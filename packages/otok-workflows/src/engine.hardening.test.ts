import { describe, expect, it } from "vitest";
import { defineWorkflow, z } from "./define-workflow.js";
import { WorkflowEngine } from "./engine.js";
import { createMemoryWorkflowStore } from "./providers/memory.js";

const manual = { autoExecute: false as const };

describe("workflow hardening", () => {
  it("claims runnable instances exclusively", async () => {
    const store = createMemoryWorkflowStore();
    const wf = defineWorkflow({
      name: "claim.test",
      input: z.object({}),
      run: async () => ({ ok: true }),
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    await engine.start(wf, {}, manual);
    await engine.start(wf, {}, manual);

    const [a, b] = await Promise.all([
      store.claimRunnable(1, { workerId: "a", leaseMs: 5_000 }),
      store.claimRunnable(1, { workerId: "b", leaseMs: 5_000 }),
    ]);
    expect(a.length + b.length).toBe(2);
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });

  it("pause in one process blocks execute in another", async () => {
    const store = createMemoryWorkflowStore();
    const wf = defineWorkflow({
      name: "pause.cross",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("work", () => "done");
        return { ok: true };
      },
    });

    const engine1 = new WorkflowEngine({ store });
    engine1.register(wf);
    const instance = await engine1.start(wf, {}, manual);

    const engine2 = new WorkflowEngine({ store });
    engine2.register(wf);
    await engine2.pause(instance.id);

    const result = await engine1.execute(instance.id);
    expect(result?.status).toBe("paused");
  });

  it("uses runAttempts for workflow retries, not failed step rows", async () => {
    const store = createMemoryWorkflowStore();
    let execs = 0;
    const wf = defineWorkflow({
      name: "runAttempts.test",
      input: z.object({}),
      retry: { maxAttempts: 2, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 },
      run: async ({ step }) => {
        execs++;
        await step.run(
          "always-fail",
          () => {
            throw new Error("nope");
          },
          { retry: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 } },
        );
        return { ok: true };
      },
    });

    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    const instance = await engine.start(wf, {}, manual);
    await expect(engine.execute(instance.id)).rejects.toThrow("nope");

    let status = await engine.getStatus(instance.id);
    expect(status?.runAttempts).toBe(1);
    expect(status?.status).toBe("failed");

    await expect(engine.execute(instance.id)).rejects.toThrow("nope");
    status = await engine.getStatus(instance.id);
    expect(status?.runAttempts).toBe(2);
    expect(status?.status).toBe("dead");
    expect(execs).toBe(2);
  });

  it("rejects resume after definition version bump", async () => {
    const store = createMemoryWorkflowStore();
    const wfV1 = defineWorkflow({
      name: "versioned",
      version: 1,
      input: z.object({}),
      run: async () => ({ v: 1 }),
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wfV1);
    const instance = await engine.start(wfV1, {}, manual);

    const wfV2 = defineWorkflow({
      name: "versioned",
      version: 2,
      input: z.object({}),
      run: async () => ({ v: 2 }),
    });
    engine.register(wfV2);

    await expect(engine.execute(instance.id)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
    const status = await engine.getStatus(instance.id);
    expect(status?.status).toBe("dead");
  });

  it("dedupes cron ticks in the same UTC minute", async () => {
    const store = createMemoryWorkflowStore();
    const wf = defineWorkflow({
      name: "cron.wf",
      input: z.object({ n: z.number().optional() }),
      run: async () => ({ ok: true }),
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    engine.registerCron({ workflowName: "cron.wf", cron: "* * * * *" });

    const when = new Date("2026-03-01T14:22:00.000Z");
    const first = await engine.tickCron(when);
    const second = await engine.tickCron(when);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("surfaces background execute errors via observability", async () => {
    const store = createMemoryWorkflowStore();
    const errors: unknown[] = [];
    const wf = defineWorkflow({
      name: "bg.err",
      input: z.object({}),
      run: async () => {
        throw new Error("bg fail");
      },
    });
    const engine = new WorkflowEngine({
      store,
      observability: { onExecutionError: (_id, err) => errors.push(err) },
    });
    engine.register(wf);
    await engine.start(wf, {}, { autoExecute: true, delayMs: 0 });
    await new Promise((r) => setTimeout(r, 20));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("cancel in one process blocks execute in another", async () => {
    const store = createMemoryWorkflowStore();
    const wf = defineWorkflow({
      name: "cancel.cross",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("a", () => "a");
        return { ok: true };
      },
    });
    const engine1 = new WorkflowEngine({ store });
    engine1.register(wf);
    const instance = await engine1.start(wf, {}, manual);

    const engine2 = new WorkflowEngine({ store });
    engine2.register(wf);
    await engine2.cancel(instance.id);

    const result = await engine1.execute(instance.id);
    expect(result?.status).toBe("cancelled");
  });
});

function createGate() {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { gate, open };
}

describe("workflow lease fencing", () => {
  it("blocks stale worker completion after another worker reclaims the lease", async () => {
    const store = createMemoryWorkflowStore();
    let nowMs = 1_700_000_000_000;
    const now = () => new Date(nowMs);
    const { gate, open } = createGate();
    let entered: () => void;
    const enteredGate = new Promise<void>((resolve) => {
      entered = resolve;
    });

    const wf = defineWorkflow({
      name: "lease.stale",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("block", async () => {
          entered();
          await gate;
          return "done";
        });
        return { ok: true };
      },
    });

    const engineA = new WorkflowEngine({ store, now, leaseRenewalIntervalMs: 60_000 });
    engineA.register(wf);
    const instance = await engineA.start(wf, {}, manual);
    const [claimedA] = await store.claimRunnable(1, {
      workerId: "a",
      leaseMs: 100,
      now: now(),
    });
    expect(claimedA?.leaseToken).toBeTruthy();

    const runA = engineA.execute(instance.id, { leaseToken: claimedA!.leaseToken, leaseMs: 100 });
    await enteredGate;

    nowMs += 200;
    const [claimedB] = await store.claimRunnable(1, { workerId: "b", leaseMs: 5_000, now: now() });
    expect(claimedB?.leaseToken).not.toBe(claimedA!.leaseToken);

    open();
    const resultA = await runA;
    expect(resultA?.status).not.toBe("completed");

    const engineB = new WorkflowEngine({ store, now });
    engineB.register(wf);
    const resultB = await engineB.execute(instance.id, { leaseToken: claimedB!.leaseToken, leaseMs: 5_000 });
    expect(resultB?.status).toBe("completed");
  });

  it("does not overwrite paused status when a blocked step finishes", async () => {
    const store = createMemoryWorkflowStore();
    const { gate, open } = createGate();
    const wf = defineWorkflow({
      name: "pause.midstep",
      input: z.object({}),
      run: async ({ step }) => {
        await step.run("block", async () => {
          await gate;
          return 1;
        });
        return { ok: true };
      },
    });

    const engine1 = new WorkflowEngine({ store });
    engine1.register(wf);
    const instance = await engine1.start(wf, {}, manual);
    const run = engine1.execute(instance.id);

    const engine2 = new WorkflowEngine({ store });
    engine2.register(wf);
    await engine2.pause(instance.id);

    open();
    const result = await run;
    expect(result?.status).toBe("paused");
  });

  it("rejects unclaimed execute while another worker holds an active lease", async () => {
    const store = createMemoryWorkflowStore();
    const wf = defineWorkflow({
      name: "lease.blocked",
      input: z.object({}),
      run: async () => ({ ok: true }),
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    const instance = await engine.start(wf, {}, manual);
    await store.claimRunnable(1, { workerId: "owner", leaseMs: 60_000 });
    await expect(engine.execute(instance.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("side effect replay", () => {
  it("replays completed step after partial progress", async () => {
    const store = createMemoryWorkflowStore();
    let sideEffects = 0;
    const wf = defineWorkflow({
      name: "replay.gap",
      input: z.object({}),
      run: async ({ step, instanceId }) => {
        await step.run(
          "external",
          () => {
            sideEffects++;
            return { charged: true };
          },
          { idempotencyKey: `${instanceId}:external` },
        );
        return { ok: true };
      },
    });
    const engine = new WorkflowEngine({ store });
    engine.register(wf);
    const instance = await engine.start(wf, {}, manual);
    await engine.execute(instance.id);
    await engine.execute(instance.id);
    expect(sideEffects).toBe(1);
  });
});
