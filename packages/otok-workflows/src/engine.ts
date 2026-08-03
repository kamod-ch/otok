import { WorkflowException, isWaitingApproval } from "./errors.js";
import { redactForLog } from "./redaction.js";
import { computeProgress, createStepRunner, type EngineRunState } from "./step.js";
import type {
  CronTrigger,
  StartWorkflowOptions,
  WorkflowDefinition,
  WorkflowEngineOptions,
  WorkflowInstance,
  WorkflowObservability,
  WorkflowStore,
} from "./types.js";
import { resolveRetryPolicy } from "./retry.js";

export class WorkflowEngine {
  private readonly store: WorkflowStore;
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly defaultRetry: ReturnType<typeof resolveRetryPolicy>;
  private readonly observability?: WorkflowObservability;
  private readonly runState = new Map<string, EngineRunState>();
  private readonly cronTriggers: CronTrigger[] = [];
  private readonly eventTriggers = new Map<string, { workflowName: string; mapInput?: (payload: unknown) => unknown }[]>();
  private readonly now: () => Date;

  constructor(options: WorkflowEngineOptions) {
    this.store = options.store;
    this.defaultRetry = resolveRetryPolicy(options.retry);
    this.observability = options.observability;
    this.now = options.now ?? (() => new Date());
  }

  register<TInput, TOutput>(definition: WorkflowDefinition<TInput, TOutput>): void {
    this.definitions.set(definition.name, definition as WorkflowDefinition);
  }

  registerCron(trigger: CronTrigger): void {
    this.cronTriggers.push(trigger);
  }

  registerEvent(trigger: import("./types.js").EventTrigger): void {
    const list = this.eventTriggers.get(trigger.eventName) ?? [];
    list.push({ workflowName: trigger.workflowName, mapInput: trigger.mapInput });
    this.eventTriggers.set(trigger.eventName, list);
  }

  getDefinition(name: string): WorkflowDefinition | undefined {
    return this.definitions.get(name);
  }

  async start<TInput, TOutput>(
    definition: WorkflowDefinition<TInput, TOutput>,
    input: TInput,
    options: StartWorkflowOptions = {},
  ): Promise<WorkflowInstance<TInput, TOutput>> {
    if (definition.inputSchema) {
      const parsed = definition.inputSchema.safeParse(input);
      if (!parsed.success) {
        throw new WorkflowException("INVALID_INPUT", parsed.error.message);
      }
      input = parsed.data;
    }

    if (options.idempotencyKey) {
      const existing = await this.store.findByIdempotencyKey(options.idempotencyKey);
      if (existing) {
        return existing as WorkflowInstance<TInput, TOutput>;
      }
    }

    const now = this.now().toISOString();
    const instance: WorkflowInstance<TInput, TOutput> = {
      id: crypto.randomUUID(),
      workflowName: definition.name,
      status: options.delayMs ? "pending" : "running",
      input,
      progress: 0,
      idempotencyKey: options.idempotencyKey,
      createdAt: now,
      updatedAt: now,
      requestId: options.requestId,
      metadata: {
        ...options.metadata,
        availableAt: options.delayMs
          ? new Date(this.now().getTime() + options.delayMs).toISOString()
          : now,
      },
    };

    await this.store.createInstance(instance as WorkflowInstance);

    if (!options.delayMs && options.autoExecute !== false) {
      void this.execute(instance.id);
    }

    return instance;
  }

  async execute(instanceId: string): Promise<WorkflowInstance | undefined> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) return undefined;

    const definition = this.definitions.get(instance.workflowName);
    if (!definition) {
      throw new WorkflowException("NOT_FOUND", `Unknown workflow "${instance.workflowName}"`);
    }

    if (instance.status === "cancelled" || instance.status === "completed" || instance.status === "dead") {
      return instance;
    }

    if (instance.status === "paused") {
      return instance;
    }

    const availableAt = instance.metadata?.availableAt as string | undefined;
    if (availableAt && new Date(availableAt).getTime() > this.now().getTime()) {
      return instance;
    }

    const state: EngineRunState = this.runState.get(instanceId) ?? { cancelled: false, paused: false };
    this.runState.set(instanceId, state);

    await this.store.updateInstance(instanceId, {
      status: "running",
      startedAt: instance.startedAt ?? this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });

    this.observability?.onWorkflowStart?.(instance);

    const step = createStepRunner(instance, this.store, state, resolveRetryPolicy(definition.retry ?? this.defaultRetry), this.observability);

    try {
      const output = await definition.run({
        input: instance.input,
        instanceId,
        workflowName: instance.workflowName,
        requestId: instance.requestId,
        step,
      });

      let validated = output;
      if (definition.outputSchema) {
        const parsed = definition.outputSchema.safeParse(output);
        if (!parsed.success) {
          throw new WorkflowException("INVALID_INPUT", `Invalid workflow output: ${parsed.error.message}`);
        }
        validated = parsed.data;
      }

      const progress = await computeProgress(this.store, instanceId);
      const completed: WorkflowInstance = {
        ...instance,
        status: "completed",
        output: validated,
        progress: 100,
        completedAt: this.now().toISOString(),
        updatedAt: this.now().toISOString(),
      };
      await this.store.updateInstance(instanceId, completed);
      this.observability?.onWorkflowComplete?.(redactForLog(completed, definition.redactFields));
      return completed;
    } catch (error) {
      if (isWaitingApproval(error)) {
        return (await this.store.getInstance(instanceId)) ?? instance;
      }

      if (state.cancelled) {
        await this.store.updateInstance(instanceId, { status: "cancelled", updatedAt: this.now().toISOString() });
        return (await this.store.getInstance(instanceId)) ?? instance;
      }

      const message = error instanceof Error ? error.message : String(error);
      const steps = await this.store.listSteps(instanceId);
      const attempts = steps.filter((s) => s.status === "failed").length;
      const policy = resolveRetryPolicy(definition.retry ?? this.defaultRetry);

      if (attempts >= policy.maxAttempts) {
        if (definition.compensate) {
          await definition.compensate({
            input: instance.input,
            instanceId,
            completedSteps: steps.filter((s) => s.status === "completed"),
          });
        }
        await this.store.enqueueDeadLetter({
          instanceId,
          workflowName: instance.workflowName,
          error: message,
          failedAt: this.now().toISOString(),
          steps,
        });
        await this.store.updateInstance(instanceId, {
          status: "dead",
          error: message,
          updatedAt: this.now().toISOString(),
        });
      } else {
        await this.store.updateInstance(instanceId, {
          status: "failed",
          error: message,
          updatedAt: this.now().toISOString(),
        });
      }

      this.observability?.onWorkflowFailed?.(instance, error);
      throw error;
    } finally {
      this.runState.delete(instanceId);
    }
  }

  async pause(instanceId: string): Promise<void> {
    const state = this.runState.get(instanceId) ?? { cancelled: false, paused: false };
    state.paused = true;
    this.runState.set(instanceId, state);
    await this.store.updateInstance(instanceId, { status: "paused", updatedAt: this.now().toISOString() });
  }

  async resume(instanceId: string): Promise<WorkflowInstance | undefined> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) return undefined;

    const state = this.runState.get(instanceId) ?? { cancelled: false, paused: false };
    state.paused = false;
    this.runState.set(instanceId, state);

    if (instance.status === "waiting_approval") {
      const stepName = instance.currentStep;
      if (stepName) {
        await this.store.saveStep({
          instanceId,
          stepName,
          status: "completed",
          attempt: 1,
          completedAt: this.now().toISOString(),
          output: { approved: true },
        });
      }
      await this.store.updateInstance(instanceId, { status: "running", updatedAt: this.now().toISOString() });
    } else {
      await this.store.updateInstance(instanceId, { status: "running", updatedAt: this.now().toISOString() });
    }

    return this.execute(instanceId);
  }

  async cancel(instanceId: string): Promise<void> {
    const state = this.runState.get(instanceId) ?? { cancelled: false, paused: false };
    state.cancelled = true;
    this.runState.set(instanceId, state);
    await this.store.updateInstance(instanceId, { status: "cancelled", updatedAt: this.now().toISOString() });
  }

  async getStatus(instanceId: string): Promise<WorkflowInstance | null> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) return null;
    const progress = await computeProgress(this.store, instanceId);
    return { ...instance, progress };
  }

  async processRunnable(limit = 10): Promise<{ processed: number }> {
    const runnable = await this.store.claimRunnable(limit, this.now());
    let processed = 0;
    for (const instance of runnable) {
      try {
        await this.execute(instance.id);
        processed += 1;
      } catch {
        /* logged via observability */
      }
    }
    return { processed };
  }

  async triggerByEvent(eventName: string, payload: unknown): Promise<WorkflowInstance[]> {
    const started: WorkflowInstance[] = [];
    const triggers = this.eventTriggers.get(eventName) ?? [];
    for (const trigger of triggers) {
      const def = this.definitions.get(trigger.workflowName);
      if (!def) continue;
      const input = trigger.mapInput ? trigger.mapInput(payload) : payload;
      const instance = await this.start(def, input);
      started.push(instance);
    }
    return started;
  }
}
