import { describe, expect, it } from "vitest";
import { resolveRetryPolicy, retryDelay, withRetry } from "./retry.js";

describe("retry", () => {
  it("computes exponential backoff delay", () => {
    const policy = resolveRetryPolicy({ initialDelayMs: 100, backoffMultiplier: 2 });
    expect(retryDelay(policy, 1)).toBe(100);
    expect(retryDelay(policy, 2)).toBe(200);
    expect(retryDelay(policy, 3)).toBe(400);
  });

  it("retries until success", async () => {
    let attempts = 0;
    await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
      },
      resolveRetryPolicy({ maxAttempts: 3 }),
      async () => {},
    );
    expect(attempts).toBe(3);
  });
});
