import type { QueueRuntime } from "./types.js";

let runtime: QueueRuntime | null = null;

/** @internal Test helper */
export function resetQueueRuntimeForTests(): void {
  runtime = null;
}

export function registerQueueRuntime<TJobs extends Record<string, unknown>>(
  value: QueueRuntime<TJobs>,
): void {
  runtime = value as QueueRuntime;
}

export function getQueueRuntime<TJobs extends Record<string, unknown> = Record<string, unknown>>(): QueueRuntime<TJobs> {
  if (!runtime) {
    throw new Error(
      "otok-queue: no queue runtime registered. Add queue() to otok.config.ts plugins.",
    );
  }
  return runtime as QueueRuntime<TJobs>;
}
