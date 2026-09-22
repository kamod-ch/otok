import { randomUUID } from "node:crypto";
import type {
  ClaimRunnableOptions,
  ClaimedWorkflowInstance,
  StepRecord,
  WorkflowDeadLetter,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowStore,
} from "../types.js";

export class MemoryWorkflowStore implements WorkflowStore {
  readonly instances = new Map<string, WorkflowInstance>();
  readonly steps = new Map<string, StepRecord>();
  readonly idempotency = new Map<string, string>();
  readonly deadLetters: WorkflowDeadLetter[] = [];
  readonly cronFires = new Set<string>();

  private stepKey(instanceId: string, stepName: string): string {
    return `${instanceId}:${stepName}`;
  }

  async createInstance(instance: WorkflowInstance): Promise<void> {
    this.instances.set(instance.id, structuredClone(instance));
    if (instance.idempotencyKey) {
      this.idempotency.set(instance.idempotencyKey, instance.id);
    }
  }

  async getInstance(id: string): Promise<WorkflowInstance | null> {
    const instance = this.instances.get(id);
    return instance ? structuredClone(instance) : null;
  }

  async findByIdempotencyKey(key: string): Promise<WorkflowInstance | null> {
    const id = this.idempotency.get(key);
    return id ? this.getInstance(id) : null;
  }

  async updateInstance(id: string, patch: Partial<WorkflowInstance>): Promise<void> {
    const current = this.instances.get(id);
    if (!current) return;
    this.instances.set(id, { ...current, ...structuredClone(patch), updatedAt: new Date().toISOString() });
  }

  async listInstances(filter?: {
    status?: WorkflowStatus;
    workflowName?: string;
    limit?: number;
  }): Promise<WorkflowInstance[]> {
    let list = [...this.instances.values()];
    if (filter?.status) list = list.filter((i) => i.status === filter.status);
    if (filter?.workflowName) list = list.filter((i) => i.workflowName === filter.workflowName);
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list.map((i) => structuredClone(i));
  }

  async getStep(instanceId: string, stepName: string): Promise<StepRecord | null> {
    const step = this.steps.get(this.stepKey(instanceId, stepName));
    return step ? structuredClone(step) : null;
  }

  async saveStep(step: StepRecord): Promise<void> {
    this.steps.set(this.stepKey(step.instanceId, step.stepName), structuredClone(step));
  }

  async listSteps(instanceId: string): Promise<StepRecord[]> {
    return [...this.steps.values()].filter((s) => s.instanceId === instanceId).map((s) => structuredClone(s));
  }

  async enqueueDeadLetter(record: WorkflowDeadLetter): Promise<void> {
    this.deadLetters.push(structuredClone(record));
  }

  async claimRunnable(limit: number, options: ClaimRunnableOptions = {}): Promise<ClaimedWorkflowInstance[]> {
    const now = options.now ?? new Date();
    const workerId = options.workerId ?? "worker";
    const leaseMs = options.leaseMs ?? 30_000;
    const claimed: ClaimedWorkflowInstance[] = [];

    for (const instance of [...this.instances.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (claimed.length >= limit) break;
      if (!this.isRunnable(instance, now)) continue;
      if (instance.status === "running" && instance.leaseUntil && new Date(instance.leaseUntil) > now) {
        continue;
      }

      const token = randomUUID();
      const patch: WorkflowInstance = {
        ...instance,
        status: "running",
        leaseOwner: workerId,
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + leaseMs).toISOString(),
        updatedAt: now.toISOString(),
      };
      this.instances.set(instance.id, patch);
      claimed.push({ ...structuredClone(patch), leaseToken: token });
    }
    return claimed;
  }

  async releaseClaim(instanceId: string, leaseToken: string): Promise<boolean> {
    const current = this.instances.get(instanceId);
    if (!current || current.leaseToken !== leaseToken) return false;
    this.instances.set(instanceId, {
      ...current,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseUntil: undefined,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async claimCronFire(scheduleName: string, fireAtUtc: Date): Promise<boolean> {
    const key = `${scheduleName}:${fireAtUtc.toISOString()}`;
    if (this.cronFires.has(key)) return false;
    this.cronFires.add(key);
    return true;
  }

  private isRunnable(instance: WorkflowInstance, now: Date): boolean {
    if (instance.status === "pending" || instance.status === "failed") {
      const availableAt = instance.metadata?.availableAt as string | undefined;
      return !availableAt || new Date(availableAt).getTime() <= now.getTime();
    }
    if (instance.status === "running") {
      if (!instance.leaseToken) return true;
      return Boolean(instance.leaseUntil && new Date(instance.leaseUntil).getTime() <= now.getTime());
    }
    return false;
  }
}

export function createMemoryWorkflowStore(): MemoryWorkflowStore {
  return new MemoryWorkflowStore();
}
