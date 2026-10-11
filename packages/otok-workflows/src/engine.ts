import { WorkflowException, isWaitingApproval } from "./errors.js";
import { redactForLog } from "./redaction.js";
import { computeProgress, createStepRunner } from "./step.js";
import type {
  CronTrigger,
  StartWorkflowOptions,
  WorkflowDefinition,
  WorkflowEngineOptions,
  WorkflowInstance,
  WorkflowObservability,
  WorkflowStore,
} from "./types.js";
import { resolveRetryPolicy, retryDelay } from "./retry.js";
import { cronFireAtUtc, cronMatches } from "./utils/cron.js";

export interface ExecuteOptions {
  leaseToken?: string;
  /** Lease duration used by `renewLease` during claimed execution (default 30s). */
  leaseMs?: number;
}

export class WorkflowEngine {
  private readonly store: WorkflowStore;
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly defaultRetry: ReturnType<typeof resolveRetryPolicy>;
  private readonly observability?: WorkflowObservability;
  private readonly cronTriggers: CronTrigger[] = [];
  private readonly eventTriggers = new Map<
    string,
    { workflowName: string; mapInput?: (payload: unknown) => unknown }[]
  >();
  private readonly now: () => Date;
  private readonly leaseRenewalIntervalMs: number;
  private readonly defaultLeaseMs = 30_000;

  constructor(options: WorkflowEngineOptions) {
    this.store = options.store;
    this.defaultRetry = resolveRetryPolicy(options.retry);
    this.observability = options.observability;
    this.now = options.now ?? (() => new Date());
    this.leaseRenewalIntervalMs = options.leaseRenewalIntervalMs ?? 5_000;
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

    const policy = resolveRetryPolicy(definition.retry ?? this.defaultRetry);
    const now = this.now().toISOString();
    const instance: WorkflowInstance<TInput, TOutput> = {
      id: crypto.randomUUID(),
      workflowName: definition.name,
      status: options.delayMs ? "pending" : "running",
      input,
      progress: 0,
      idempotencyKey: options.idempotencyKey,
      workflowVersion: definition.version ?? 1,
      runAttempts: 0,
      maxRunAttempts: policy.maxAttempts,
      createdAt: now,
      updatedAt: now,
      requestId: options.requestId,
      metadata: {
        ...options.metadata,
        availableAt: options.delayMs ? new Date(this.now().getTime() + options.delayMs).toISOString() : now,
      },
    };

    await this.store.createInstance(instance as WorkflowInstance);

    if (!options.delayMs && options.autoExecute !== false) {
      this.scheduleExecute(instance.id);
    }

    return instance;
  }

  private scheduleExecute(instanceId: string, options?: ExecuteOptions): void {
    void this.execute(instanceId, options).catch((error) => {
      if (isWaitingApproval(error)) return;
      if (error instanceof WorkflowException && (error.code === "PAUSED" || error.code === "CANCELLED")) {
        return;
      }
      if (error instanceof WorkflowException && error.code === "LEASE_LOST") {
        return;
      }
      this.observability?.onExecutionError?.(instanceId, error);
    });
  }

  async execute(instanceId: string, options: ExecuteOptions = {}): Promise<WorkflowInstance | undefined> {
    let instance = await this.store.getInstance(instanceId);
    if (!instance) return undefined;

    if (options.leaseToken && instance.leaseToken !== options.leaseToken) {
      throw new WorkflowException("NOT_FOUND", `Lease lost for workflow "${instanceId}"`);
    }

    if (
      !options.leaseToken &&
      instance.leaseToken &&
      instance.leaseUntil &&
      new Date(instance.leaseUntil).getTime() > this.now().getTime()
    ) {
      throw new WorkflowException("NOT_FOUND", `Workflow "${instanceId}" is leased by another worker`);
    }

    const held = options.leaseToken ? { leaseToken: options.leaseToken } : undefined;
    const leaseMs = options.leaseMs ?? this.defaultLeaseMs;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    if (held) {
      heartbeat = setInterval(() => {
        void this.store.renewLease(instanceId, held.leaseToken, { leaseMs, now: this.now() });
      }, this.leaseRenewalIntervalMs);
    }

    const definition = this.definitions.get(instance.workflowName);
    if (!definition) {
      throw new WorkflowException("NOT_FOUND", `Unknown workflow "${instance.workflowName}"`);
    }

    const defVersion = definition.version ?? 1;
    const pinnedVersion = instance.workflowVersion ?? 1;
    if (defVersion !== pinnedVersion) {
      const message = `Workflow version mismatch: instance=${pinnedVersion}, definition=${defVersion}`;
      await this.store.updateInstance(instanceId, {
        status: "dead",
        error: message,
        updatedAt: this.now().toISOString(),
      });
      throw new WorkflowException("VERSION_MISMATCH", message);
    }

    instance = (await this.store.getInstance(instanceId)) ?? instance;

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

    if (held) {
      const ok = await this.store.updateInstanceIfHeld(
        instanceId,
        {
          status: "running",
          startedAt: instance.startedAt ?? this.now().toISOString(),
          updatedAt: this.now().toISOString(),
        },
        held,
      );
      if (!ok) {
        return (await this.store.getInstance(instanceId)) ?? instance;
      }
    } else {
      const fresh = await this.store.getInstance(instanceId);
      if (fresh?.status === "paused" || fresh?.status === "cancelled") {
        return fresh;
      }
      await this.store.updateInstance(instanceId, {
        status: "running",
        startedAt: instance.startedAt ?? this.now().toISOString(),
        updatedAt: this.now().toISOString(),
      });
    }

    instance = (await this.store.getInstance(instanceId)) ?? instance;
    this.observability?.onWorkflowStart?.(instance);

    const step = createStepRunner(
      instance,
      this.store,
      resolveRetryPolicy(definition.retry ?? this.defaultRetry),
      this.observability,
      held,
    );

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

      const latest = await this.store.getInstance(instanceId);
      if (latest?.status === "paused" || latest?.status === "cancelled") {
        return latest;
      }

      const completed: WorkflowInstance = {
        ...(latest ?? instance),
        status: "completed",
        output: validated,
        progress: 100,
        completedAt: this.now().toISOString(),
        updatedAt: this.now().toISOString(),
      };
      if (held) {
        const ok = await this.store.updateInstanceIfHeld(instanceId, completed, held);
        if (!ok) {
          throw new WorkflowException("LEASE_LOST", `Lease lost for workflow "${instanceId}"`);
        }
      } else {
        await this.store.updateInstance(instanceId, completed);
      }
      this.observability?.onWorkflowComplete?.(redactForLog(completed, definition.redactFields));
      return completed;
    } catch (error) {
      if (isWaitingApproval(error)) {
        return (await this.store.getInstance(instanceId)) ?? instance;
      }

      if (error instanceof WorkflowException && (error.code === "CANCELLED" || error.code === "PAUSED")) {
        return (await this.store.getInstance(instanceId)) ?? instance;
      }

      if (error instanceof WorkflowException && error.code === "LEASE_LOST") {
        return (await this.store.getInstance(instanceId)) ?? instance;
      }

      if (error instanceof WorkflowException && error.code === "VERSION_MISMATCH") {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const policy = resolveRetryPolicy(definition.retry ?? this.defaultRetry);
      const nextRunAttempts = (instance.runAttempts ?? 0) + 1;

      if (nextRunAttempts >= (instance.maxRunAttempts ?? policy.maxAttempts)) {
        const steps = await this.store.listSteps(instanceId);
        const deadPatch = {
          status: "dead" as const,
          error: message,
          runAttempts: nextRunAttempts,
          updatedAt: this.now().toISOString(),
        };
        if (held) {
          const ok = await this.store.updateInstanceIfHeld(instanceId, deadPatch, held);
          if (!ok) {
            throw new WorkflowException("LEASE_LOST", `Lease lost for workflow "${instanceId}"`);
          }
        } else {
          await this.store.updateInstance(instanceId, deadPatch);
        }
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
      } else {
        const delay = retryDelay(policy, nextRunAttempts);
        const available = new Date(this.now().getTime() + delay).toISOString();
        const failedPatch = {
          status: "failed" as const,
          error: message,
          runAttempts: nextRunAttempts,
          metadata: { ...instance.metadata, availableAt: available },
          updatedAt: this.now().toISOString(),
        };
        if (held) {
          const ok = await this.store.updateInstanceIfHeld(instanceId, failedPatch, held);
          if (!ok) {
            throw new WorkflowException("LEASE_LOST", `Lease lost for workflow "${instanceId}"`);
          }
        } else {
          await this.store.updateInstance(instanceId, failedPatch);
        }
      }

      this.observability?.onWorkflowFailed?.(instance, error);
      throw error;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      if (options.leaseToken) {
        await this.store.releaseClaim(instanceId, options.leaseToken);
      }
    }
  }

  async pause(instanceId: string): Promise<void> {
    await this.store.updateInstance(instanceId, { status: "paused", updatedAt: this.now().toISOString() });
  }

  async resume(instanceId: string): Promise<WorkflowInstance | undefined> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) return undefined;

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
    await this.store.updateInstance(instanceId, { status: "cancelled", updatedAt: this.now().toISOString() });
  }

  async getStatus(instanceId: string): Promise<WorkflowInstance | null> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) return null;
    const progress = await computeProgress(this.store, instanceId);
    return { ...instance, progress };
  }

  async processRunnable(limit = 10): Promise<{ processed: number }> {
    const runnable = await this.store.claimRunnable(limit, { now: this.now() });
    let processed = 0;
    for (const instance of runnable) {
      try {
        await this.execute(instance.id, { leaseToken: instance.leaseToken, leaseMs: this.defaultLeaseMs });
        processed += 1;
      } catch (error) {
        if (isWaitingApproval(error)) {
          processed += 1;
          continue;
        }
        if (error instanceof WorkflowException && error.code === "LEASE_LOST") {
          continue;
        }
        this.observability?.onExecutionError?.(instance.id, error);
      }
    }
    return { processed };
  }

  /**
   * UTC minute-bucket cron (five-field subset). Missed ticks while offline are not backfilled.
   */
  async tickCron(now: Date = this.now()): Promise<WorkflowInstance[]> {
    const started: WorkflowInstance[] = [];
    for (const trigger of this.cronTriggers) {
      if (trigger.timezone && trigger.timezone !== "UTC") {
        continue;
      }
      if (!cronMatches(trigger.cron, now)) continue;
      const fireAt = cronFireAtUtc(now);
      const scheduleKey = trigger.workflowName;
      const acquired = await this.store.claimCronFire(scheduleKey, fireAt);
      if (!acquired) continue;

      const def = this.definitions.get(trigger.workflowName);
      if (!def) continue;
      const input = trigger.input ?? {};
      const instance = await this.start(def, input, {
        autoExecute: false,
        idempotencyKey: `cron:${scheduleKey}:${fireAt.toISOString()}`,
      });
      this.scheduleExecute(instance.id);
      started.push(instance);
    }
    return started;
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
