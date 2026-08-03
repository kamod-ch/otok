import type { ZodType, output } from "zod";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled"
  | "dead";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "compensated";

export interface WorkflowInstance<TInput = unknown, TOutput = unknown> {
  id: string;
  workflowName: string;
  status: WorkflowStatus;
  input: TInput;
  output?: TOutput;
  progress: number;
  currentStep?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface StepRecord {
  instanceId: string;
  stepName: string;
  status: StepStatus;
  attempt: number;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  idempotencyKey?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

export interface WorkflowStepContext<TInput = unknown> {
  input: TInput;
  instanceId: string;
  workflowName: string;
  requestId?: string;
  step: StepRunner;
}

export interface StepRunner {
  /** Run a durable step — replays cached output after crash, never re-executes completed steps. */
  run<T>(name: string, fn: () => T | Promise<T>, options?: StepRunOptions): Promise<T>;
  /** Sleep for ms — persisted as a completed step so resume skips the wait. */
  sleep(name: string, ms: number): Promise<void>;
  /** Pause workflow until manual approval. */
  waitForApproval(name: string, metadata?: Record<string, unknown>): Promise<void>;
  /** Run steps in parallel — each sub-step is individually durable. */
  parallel<T extends Record<string, () => unknown | Promise<unknown>>>(
    name: string,
    steps: T,
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>;
}

export interface StepRunOptions {
  retry?: Partial<RetryPolicy>;
  timeoutMs?: number;
  idempotencyKey?: string;
}

export interface WorkflowDefinition<TInput = unknown, TOutput = unknown> {
  readonly __kind: "otok-workflow";
  readonly name: string;
  readonly inputSchema?: ZodType<TInput>;
  readonly outputSchema?: ZodType<TOutput>;
  readonly retry?: Partial<RetryPolicy>;
  readonly timeoutMs?: number;
  readonly redactFields?: readonly string[];
  readonly compensate?: (ctx: WorkflowCompensateContext<TInput>) => void | Promise<void>;
  readonly run: (ctx: WorkflowStepContext<TInput>) => TOutput | Promise<TOutput>;
}

export interface WorkflowCompensateContext<TInput = unknown> {
  input: TInput;
  instanceId: string;
  completedSteps: StepRecord[];
}

export interface StartWorkflowOptions {
  idempotencyKey?: string;
  requestId?: string;
  delayMs?: number;
  metadata?: Record<string, unknown>;
  /** When false, the engine does not run the workflow until `execute()` is called. Default true. */
  autoExecute?: boolean;
}

export interface CronTrigger {
  workflowName: string;
  cron: string;
  input?: unknown;
  timezone?: string;
}

export interface EventTrigger {
  eventName: string;
  workflowName: string;
  mapInput?: (payload: unknown) => unknown;
}

export interface WebhookTrigger {
  workflowName: string;
  path: string;
  secret?: string;
}

export interface WorkflowStore {
  createInstance(instance: WorkflowInstance): Promise<void>;
  getInstance(id: string): Promise<WorkflowInstance | null>;
  findByIdempotencyKey(key: string): Promise<WorkflowInstance | null>;
  updateInstance(id: string, patch: Partial<WorkflowInstance>): Promise<void>;
  listInstances(filter?: { status?: WorkflowStatus; workflowName?: string; limit?: number }): Promise<WorkflowInstance[]>;

  getStep(instanceId: string, stepName: string): Promise<StepRecord | null>;
  saveStep(step: StepRecord): Promise<void>;
  listSteps(instanceId: string): Promise<StepRecord[]>;

  enqueueDeadLetter(record: WorkflowDeadLetter): Promise<void>;
  claimRunnable(limit: number, now?: Date): Promise<WorkflowInstance[]>;
}

export interface WorkflowDeadLetter {
  instanceId: string;
  workflowName: string;
  error: string;
  failedAt: string;
  steps: StepRecord[];
}

export interface WorkflowEngineOptions {
  store: WorkflowStore;
  retry?: Partial<RetryPolicy>;
  observability?: WorkflowObservability;
  now?: () => Date;
}

export interface WorkflowObservability {
  onWorkflowStart?(instance: WorkflowInstance): void;
  onWorkflowComplete?(instance: WorkflowInstance): void;
  onWorkflowFailed?(instance: WorkflowInstance, error: unknown): void;
  onStepStart?(instance: WorkflowInstance, stepName: string): void;
  onStepComplete?(instance: WorkflowInstance, stepName: string, output: unknown): void;
  onStepRetry?(instance: WorkflowInstance, stepName: string, attempt: number, error: unknown): void;
}

export interface CloudWorkflowProviderContract {
  providerName: string;
  deployWorkflow(definition: WorkflowDefinition): Promise<{ deploymentId: string }>;
  invoke(instanceId: string): Promise<void>;
  integrationNotes: string[];
}

export type InferWorkflowInput<T> = T extends WorkflowDefinition<infer I, unknown> ? I : never;
export type InferWorkflowOutput<T> = T extends WorkflowDefinition<unknown, infer O> ? O : never;

export function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function parseJson<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T;
}
