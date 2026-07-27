import { isRetryableQueueError } from "./errors.js";
import type {
  EnqueueOptions,
  JobHandler,
  JobPayloadMap,
  ProcessResult,
  QueueJob,
  QueueRuntime,
} from "./types.js";

export class QueueClient<TJobs extends JobPayloadMap = JobPayloadMap> {
  constructor(private readonly runtime: QueueRuntime<TJobs>) {}

  async enqueue<TName extends keyof TJobs & string>(
    name: TName,
    payload: TJobs[TName],
    options?: EnqueueOptions,
  ): Promise<QueueJob<TName, TJobs[TName]>> {
    return this.runtime.provider.enqueue(name, payload, {
      maxAttempts: options?.maxAttempts ?? this.runtime.retry.maxAttempts,
      ...options,
    });
  }

  async process(
    handlers: Partial<{
      [K in keyof TJobs & string]: JobHandler<TJobs[K]>;
    }>,
  ): Promise<ProcessResult> {
    const result: ProcessResult = { processed: 0, failed: 0, deadLettered: 0 };
    const jobs = await this.runtime.provider.claim();

    for (const job of jobs) {
      const handler = handlers[job.name as keyof TJobs & string];
      if (!handler) {
        await this.runtime.provider.fail(job.id, `no handler registered for job "${job.name}"`, false);
        result.deadLettered += 1;
        continue;
      }

      try {
        await handler(job.payload as TJobs[keyof TJobs & string]);
        await this.runtime.provider.complete(job.id);
        result.processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "job failed";
        const retryable = isRetryableQueueError(error);
        await this.runtime.provider.fail(job.id, message, retryable);
        if (!retryable || job.attempts >= job.maxAttempts) {
          result.deadLettered += 1;
        } else {
          result.failed += 1;
        }
      }
    }

    return result;
  }

  async tickCron(now?: Date): Promise<QueueJob[]> {
    const tick = this.runtime.provider.tickCron;
    if (!tick) {
      throw new Error(`queue provider "${this.runtime.provider.name}" does not support cron jobs`);
    }
    return tick(now);
  }
}

export function createQueueClient<TJobs extends JobPayloadMap>(
  runtime: QueueRuntime<TJobs>,
): QueueClient<TJobs> {
  return new QueueClient(runtime);
}
