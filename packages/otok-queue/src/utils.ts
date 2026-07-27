import type { QueueRetryDefaults } from "./types.js";

export const DEFAULT_QUEUE_RETRY: QueueRetryDefaults = {
  maxAttempts: 5,
  initialBackoffMs: 500,
  maxBackoffMs: 60_000,
};

export function resolveQueueRetry(retry?: Partial<QueueRetryDefaults>): QueueRetryDefaults {
  return {
    maxAttempts: retry?.maxAttempts ?? DEFAULT_QUEUE_RETRY.maxAttempts,
    initialBackoffMs: retry?.initialBackoffMs ?? DEFAULT_QUEUE_RETRY.initialBackoffMs,
    maxBackoffMs: retry?.maxBackoffMs ?? DEFAULT_QUEUE_RETRY.maxBackoffMs,
  };
}

export function computeBackoff(attempt: number, initialMs: number, maxMs: number): number {
  return Math.min(initialMs * 2 ** Math.max(attempt - 1, 0), maxMs);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimal cron matcher for five-field patterns: minute hour dom month dow (UTC). */
export function cronMatches(expression: string, date: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;
  return (
    matchField(minute, date.getUTCMinutes(), 0, 59) &&
    matchField(hour, date.getUTCHours(), 0, 23) &&
    matchField(dom, date.getUTCDate(), 1, 31) &&
    matchField(month, date.getUTCMonth() + 1, 1, 12) &&
    matchField(dow, date.getUTCDay(), 0, 6)
  );
}

function matchField(pattern: string, value: number, min: number, max: number): boolean {
  if (pattern === "*") return true;
  return pattern.split(",").some((segment) => {
    if (segment.includes("/")) {
      const [base, stepRaw] = segment.split("/");
      const step = Number(stepRaw);
      if (!step) return false;
      const start = base === "*" ? min : Number(base);
      return value >= start && (value - start) % step === 0;
    }
    if (segment.includes("-")) {
      const [startRaw, endRaw] = segment.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      return value >= start && value <= end;
    }
    return Number(segment) === value;
  });
}
