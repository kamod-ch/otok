export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

export interface QueueProviderCapabilities {
  delayedJobs: boolean;
  cronJobs: boolean;
  idempotency: boolean;
  deadLetter: boolean;
  persistence: boolean;
}

export type JobPayloadMap = Record<string, unknown>;

export interface EnqueueOptions {
  idempotencyKey?: string;
  delayMs?: number;
  maxAttempts?: number;
  runAt?: Date;
}

export interface QueueJob<TName extends string = string, TPayload = unknown> {
  id: string;
  name: TName;
  payload: TPayload;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  createdAt: string;
  availableAt: string;
  lastError?: string;
}

export interface CronSchedule {
  name: string;
  cron: string;
  jobName: string;
  payload?: unknown;
  timezone?: string;
}

export interface QueueProvider<TJobs extends JobPayloadMap = JobPayloadMap> {
  readonly name: string;
  readonly capabilities: QueueProviderCapabilities;
  enqueue<TName extends keyof TJobs & string>(
    name: TName,
    payload: TJobs[TName],
    options?: EnqueueOptions,
  ): Promise<QueueJob<TName, TJobs[TName]>>;
  claim(limit?: number): Promise<QueueJob[]>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string, retryable?: boolean): Promise<void>;
  moveToDeadLetter(jobId: string, error: string): Promise<void>;
  findByIdempotencyKey?(key: string): Promise<QueueJob | null>;
  registerCron?(schedule: CronSchedule): Promise<void>;
  tickCron?(now?: Date): Promise<QueueJob[]>;
}

export type MemoryProviderConfig = {
  type: "memory";
};

export type TestProviderConfig = {
  type: "test";
};

export type QueueProviderConfig = MemoryProviderConfig | TestProviderConfig;

export interface QueueRetryDefaults {
  maxAttempts: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
}

export interface QueuePluginOptions<TJobs extends JobPayloadMap = JobPayloadMap> {
  provider: QueueProviderConfig;
  retry?: Partial<QueueRetryDefaults>;
  cron?: CronSchedule[];
  handlers?: Partial<{
    [K in keyof TJobs & string]: (payload: TJobs[K]) => void | Promise<void>;
  }>;
}

export interface QueueRuntime<TJobs extends JobPayloadMap = JobPayloadMap> {
  provider: QueueProvider<TJobs>;
  retry: QueueRetryDefaults;
  cron: CronSchedule[];
}

export type JobHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

export interface ProcessResult {
  processed: number;
  failed: number;
  deadLettered: number;
}
