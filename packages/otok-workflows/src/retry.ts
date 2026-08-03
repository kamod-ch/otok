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
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= policy.maxAttempts) break;
      onRetry?.(attempt, error);
      await new Promise((r) => setTimeout(r, retryDelay(policy, attempt)));
    }
  }
  throw lastError;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Step "${label}" timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
