import { WorkflowException } from "./errors.js";
import type {
  StepRecord,
  StepRunOptions,
  StepRunner,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowObservability,
  WorkflowStore,
} from "./types.js";
import { resolveRetryPolicy, withRetry, withTimeout } from "./retry.js";

export class StepExecutor implements StepRunner {
  private readonly completedSteps: StepRecord[] = [];

  constructor(
    private readonly instance: WorkflowInstance,
    private readonly store: WorkflowStore,
    private readonly defaultRetry: ReturnType<typeof resolveRetryPolicy>,
    private readonly isCancelled: () => boolean,
    private readonly isPaused: () => boolean,
    private readonly observability?: WorkflowObservability,
  ) {}

  getCompletedSteps(): StepRecord[] {
    return [...this.completedSteps];
  }

  async run<T>(name: string, fn: () => T | Promise<T>, options: StepRunOptions = {}): Promise<T> {
    this.assertRunnable();

    const existing = await this.store.getStep(this.instance.id, name);
    if (existing?.status === "completed") {
      return existing.output as T;
    }

    const policy = resolveRetryPolicy(options.retry ?? this.defaultRetry);
    let attempt = existing?.attempt ?? 0;

    this.observability?.onStepStart?.(this.instance, name);
    await this.store.updateInstance(this.instance.id, { currentStep: name, status: "running" });

    const execute = async (): Promise<T> => {
      attempt += 1;
      const running: StepRecord = {
        instanceId: this.instance.id,
        stepName: name,
        status: "running",
        attempt,
        startedAt: new Date().toISOString(),
        idempotencyKey: options.idempotencyKey,
      };
      await this.store.saveStep(running);

      let result: T;
      if (options.timeoutMs) {
        result = await withTimeout(Promise.resolve(fn()), options.timeoutMs, name);
      } else {
        result = await fn();
      }

      const completed: StepRecord = {
        ...running,
        status: "completed",
        output: result,
        completedAt: new Date().toISOString(),
      };
      await this.store.saveStep(completed);
      this.completedSteps.push(completed);
      this.observability?.onStepComplete?.(this.instance, name, result);
      return result;
    };

    try {
      return await withRetry(execute, policy, (a, error) => {
        this.observability?.onStepRetry?.(this.instance, name, a, error);
      });
    } catch (error) {
      const failed: StepRecord = {
        instanceId: this.instance.id,
        stepName: name,
        status: "failed",
        attempt,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      };
      await this.store.saveStep(failed);
      throw error;
    }
  }

  async sleep(name: string, ms: number): Promise<void> {
    await this.run(name, async () => {
      await new Promise((r) => setTimeout(r, ms));
      return { sleptMs: ms };
    });
  }

  async waitForApproval(name: string, metadata?: Record<string, unknown>): Promise<void> {
    const existing = await this.store.getStep(this.instance.id, name);
    if (existing?.status === "completed") return;

    await this.store.saveStep({
      instanceId: this.instance.id,
      stepName: name,
      status: "running",
      attempt: 1,
      startedAt: new Date().toISOString(),
      output: metadata,
    });
    await this.store.updateInstance(this.instance.id, {
      status: "waiting_approval",
      currentStep: name,
    });

    throw new WorkflowException("WAITING_APPROVAL", `Workflow paused at step "${name}" awaiting approval`);
  }

  async parallel<T extends Record<string, () => unknown | Promise<unknown>>>(
    name: string,
    steps: T,
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    const entries = Object.entries(steps) as [keyof T & string, T[keyof T]][];
    const results = await Promise.all(
      entries.map(([stepName, fn]) =>
        this.run(`${name}.${String(stepName)}`, fn as () => Promise<unknown>),
      ),
    );
    const output = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
    entries.forEach(([key], index) => {
      output[key] = results[index] as Awaited<ReturnType<T[typeof key]>>;
    });
    return output;
  }

  private assertRunnable(): void {
    if (this.isCancelled()) {
      throw new WorkflowException("CANCELLED", "Workflow was cancelled");
    }
    if (this.isPaused()) {
      throw new WorkflowException("PAUSED", "Workflow is paused");
    }
  }
}

export interface EngineRunState {
  cancelled: boolean;
  paused: boolean;
}

export function createStepRunner(
  instance: WorkflowInstance,
  store: WorkflowStore,
  state: EngineRunState,
  defaultRetry: ReturnType<typeof resolveRetryPolicy>,
  observability?: WorkflowObservability,
): StepExecutor {
  return new StepExecutor(
    instance,
    store,
    defaultRetry,
    () => state.cancelled,
    () => state.paused,
    observability,
  );
}

export async function computeProgress(store: WorkflowStore, instanceId: string, totalHint?: number): Promise<number> {
  const steps = await store.listSteps(instanceId);
  const completed = steps.filter((s) => s.status === "completed").length;
  if (!totalHint || totalHint <= 0) return completed > 0 ? Math.min(completed * 10, 90) : 0;
  return Math.min(100, Math.round((completed / totalHint) * 100));
}

export type { WorkflowDefinition };
