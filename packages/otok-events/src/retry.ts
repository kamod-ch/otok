import type { RetryPolicy } from "./types.js";
import { DEFAULT_RETRY_POLICY } from "./types.js";

export function resolveRetryPolicy(partial?: Partial<RetryPolicy>): RetryPolicy {
  return { ...DEFAULT_RETRY_POLICY, ...partial };
}

export function retryDelay(policy: RetryPolicy, attempt: number): number {
  const delay = policy.initialDelayMs * policy.backoffMultiplier ** Math.max(0, attempt - 1);
  return Math.min(delay, policy.maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  sleep: (ms: number) => Promise<void>,
  onError?: (error: unknown, attempt: number) => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      onError?.(error, attempt);
      if (attempt >= policy.maxAttempts) break;
      await sleep(retryDelay(policy, attempt));
    }
  }
  throw lastError;
}
