import type { StepRecord, WorkflowDeadLetter, WorkflowInstance, WorkflowStatus, WorkflowStore } from "../types.js";
import { parseJson, serializeJson } from "../types.js";

export class MemoryWorkflowStore implements WorkflowStore {
  readonly instances = new Map<string, WorkflowInstance>();
  readonly steps = new Map<string, StepRecord>();
  readonly idempotency = new Map<string, string>();
  readonly deadLetters: WorkflowDeadLetter[] = [];

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

  async listInstances(filter?: { status?: WorkflowStatus; workflowName?: string; limit?: number }): Promise<WorkflowInstance[]> {
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
    return [...this.steps.values()]
      .filter((s) => s.instanceId === instanceId)
      .map((s) => structuredClone(s));
  }

  async enqueueDeadLetter(record: WorkflowDeadLetter): Promise<void> {
    this.deadLetters.push(structuredClone(record));
  }

  async claimRunnable(limit: number, now = new Date()): Promise<WorkflowInstance[]> {
    const candidates = [...this.instances.values()].filter((i) => {
      if (i.status !== "pending" && i.status !== "failed") return false;
      const availableAt = i.metadata?.availableAt as string | undefined;
      if (availableAt && new Date(availableAt).getTime() > now.getTime()) return false;
      return true;
    });
    return candidates.slice(0, limit).map((i) => structuredClone(i));
  }
}

export function createMemoryWorkflowStore(): MemoryWorkflowStore {
  return new MemoryWorkflowStore();
}

export { serializeJson, parseJson };
