import { randomUUID } from "node:crypto";
import { OtokQueueJobError } from "../errors.js";
import type {
  CronSchedule,
  EnqueueOptions,
  JobPayloadMap,
  QueueJob,
  QueueProvider,
  QueueProviderCapabilities,
} from "../types.js";
import { computeBackoff, cronMatches } from "../utils.js";

interface StoredJob extends QueueJob {
  retryable: boolean;
}

export function createMemoryQueueProvider<TJobs extends JobPayloadMap = JobPayloadMap>(
  name = "memory",
): QueueProvider<TJobs> {
  const jobs = new Map<string, StoredJob>();
  const idempotency = new Map<string, string>();
  const deadLetter: StoredJob[] = [];
  const cronSchedules: CronSchedule[] = [];
  const lastCronTick = new Map<string, string>();

  const capabilities: QueueProviderCapabilities = {
    delayedJobs: true,
    cronJobs: true,
    idempotency: true,
    deadLetter: true,
    persistence: false,
  };

  const provider: QueueProvider<TJobs> = {
    name,
    capabilities,
    async enqueue(name, payload, options: EnqueueOptions = {}) {
      if (options.idempotencyKey) {
        const existingId = idempotency.get(options.idempotencyKey);
        if (existingId) {
          const existing = jobs.get(existingId);
          if (existing) return existing as unknown as QueueJob<typeof name, TJobs[typeof name]>;
        }
      }

      const now = new Date();
      const availableAt = options.runAt?.toISOString() ?? new Date(now.getTime() + (options.delayMs ?? 0)).toISOString();
      const job: StoredJob = {
        id: randomUUID(),
        name,
        payload,
        status: "pending",
        attempts: 0,
        maxAttempts: options.maxAttempts ?? 5,
        idempotencyKey: options.idempotencyKey,
        createdAt: now.toISOString(),
        availableAt,
        retryable: true,
      };
      jobs.set(job.id, job);
      if (options.idempotencyKey) {
        idempotency.set(options.idempotencyKey, job.id);
      }
      return job as unknown as QueueJob<typeof name, TJobs[typeof name]>;
    },
    async claim(limit = 10) {
      const now = Date.now();
      const pending = [...jobs.values()]
        .filter((job) => job.status === "pending" && Date.parse(job.availableAt) <= now)
        .slice(0, limit);
      for (const job of pending) {
        job.status = "processing";
        job.attempts += 1;
      }
      return pending;
    },
    async complete(jobId) {
      const job = jobs.get(jobId);
      if (!job) throw new OtokQueueJobError(`job not found: ${jobId}`);
      job.status = "completed";
      if (job.idempotencyKey) idempotency.delete(job.idempotencyKey);
      jobs.delete(jobId);
    },
    async fail(jobId, error, retryable = true) {
      const job = jobs.get(jobId);
      if (!job) throw new OtokQueueJobError(`job not found: ${jobId}`);
      job.lastError = error;
      job.retryable = retryable;
      if (!retryable || job.attempts >= job.maxAttempts) {
        job.status = "failed";
        deadLetter.push({ ...job, status: "dead" });
        jobs.delete(jobId);
        if (job.idempotencyKey) idempotency.delete(job.idempotencyKey);
        return;
      }
      job.status = "pending";
      job.availableAt = new Date().toISOString();
    },
    async moveToDeadLetter(jobId, error) {
      const job = jobs.get(jobId);
      if (!job) throw new OtokQueueJobError(`job not found: ${jobId}`);
      job.status = "dead";
      job.lastError = error;
      deadLetter.push(job);
      jobs.delete(jobId);
      if (job.idempotencyKey) idempotency.delete(job.idempotencyKey);
    },
    async findByIdempotencyKey(key) {
      const id = idempotency.get(key);
      return id ? jobs.get(id) ?? null : null;
    },
    async registerCron(schedule) {
      cronSchedules.push(schedule);
    },
    async tickCron(now = new Date()) {
      const enqueued: QueueJob[] = [];
      for (const schedule of cronSchedules) {
        if (!cronMatches(schedule.cron, now)) continue;
        const minuteKey = `${schedule.name}:${now.toISOString().slice(0, 16)}`;
        if (lastCronTick.get(schedule.name) === minuteKey) continue;
        lastCronTick.set(schedule.name, minuteKey);
        const job = await provider.enqueue(
          schedule.jobName as keyof TJobs & string,
          schedule.payload as TJobs[keyof TJobs & string],
        );
        enqueued.push(job);
      }
      return enqueued;
    },
  };

  return provider;
}

/** @internal Test helper */
export function createTestQueueProvider<TJobs extends JobPayloadMap = JobPayloadMap>(): QueueProvider<TJobs> {
  return createMemoryQueueProvider<TJobs>("test");
}

export function getMemoryProviderInternals(provider: QueueProvider) {
  return provider as QueueProvider & {
    name: string;
  };
}
