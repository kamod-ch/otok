import type { JobHandler, JobPayloadMap, QueueProvider } from "../types.js";
import { sleep } from "../utils.js";
import { createWorkerHealth, type WorkerHealthState } from "./health.js";

export interface QueueWorkerOptions<TJobs extends JobPayloadMap> {
  provider: QueueProvider<TJobs>;
  workerId?: string;
  concurrency?: number;
  pollIntervalMs?: number;
  leaseMs?: number;
  heartbeatIntervalMs?: number;
  drainTimeoutMs?: number;
  handlers: Partial<{ [K in keyof TJobs & string]: JobHandler<TJobs[K]> }>;
  health?: WorkerHealthState;
  onError?: (error: unknown, jobId: string) => void;
}

export interface QueueWorkerHandle {
  stop(): Promise<void>;
  health: WorkerHealthState;
}

export function runQueueWorker<TJobs extends JobPayloadMap>(options: QueueWorkerOptions<TJobs>): QueueWorkerHandle {
  const workerId = options.workerId ?? `worker-${process.pid}`;
  const concurrency = options.concurrency ?? 4;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const leaseMs = options.leaseMs ?? 30_000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? Math.floor(leaseMs / 3);
  const drainTimeoutMs = options.drainTimeoutMs ?? 15_000;
  const health = options.health ?? createWorkerHealth();

  let running = true;
  let _draining = false;
  let inFlight = 0;
  const abortControllers = new Map<string, AbortController>();

  const stop = async (): Promise<void> => {
    _draining = true;
    running = false;
    for (const controller of abortControllers.values()) controller.abort();
    const deadline = Date.now() + drainTimeoutMs;
    while (inFlight > 0 && Date.now() < deadline) {
      await sleep(50);
    }
    health.ready = false;
  };

  const processJob = async (job: Awaited<ReturnType<QueueProvider["claim"]>>[number]) => {
    const handler = options.handlers[job.name as keyof TJobs & string];
    if (!handler) {
      await options.provider.fail(job.id, `no handler for "${job.name}"`, false, job.leaseToken);
      return;
    }

    const controller = new AbortController();
    abortControllers.set(job.id, controller);
    inFlight += 1;
    health.busy = inFlight;

    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    if (job.leaseToken && options.provider.heartbeat) {
      heartbeatTimer = setInterval(() => {
        void options.provider.heartbeat!(job.id, job.leaseToken!).then((ok) => {
          if (!ok) controller.abort();
        });
      }, heartbeatIntervalMs);
    }

    try {
      if (controller.signal.aborted) throw new Error("lease lost");
      await handler(job.payload as TJobs[keyof TJobs & string]);
      if (controller.signal.aborted) throw new Error("lease lost");
      await options.provider.complete(job.id, job.leaseToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "job failed";
      const retryable = message !== "lease lost";
      options.onError?.(error, job.id);
      try {
        await options.provider.fail(job.id, message, retryable, job.leaseToken);
      } catch {
        /* lease already lost */
      }
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      abortControllers.delete(job.id);
      inFlight -= 1;
      health.busy = inFlight;
    }
  };

  const loop = async () => {
    health.ready = true;
    while (running) {
      try {
        if (options.provider.tickCron) {
          await options.provider.tickCron(new Date());
        }
        const jobs = await options.provider.claim(concurrency, { workerId, leaseMs });
        if (jobs.length === 0) {
          await sleep(pollIntervalMs);
          continue;
        }
        await Promise.all(jobs.map((job) => processJob(job)));
      } catch (error) {
        options.onError?.(error, "poll");
        await sleep(pollIntervalMs);
      }
    }
  };

  void loop();

  const onSignal = () => {
    void stop();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return { stop, health };
}
