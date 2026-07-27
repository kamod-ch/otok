import { describe, expect, it, beforeEach } from "vitest";
import { OtokQueueJobError } from "./errors.js";
import { configureQueueApp, getQueueClient, resetQueueClientForTests } from "./plugin.js";
import { resetQueueRuntimeForTests } from "./registry.js";

type TestJobs = {
  "send-email": { to: string };
  "sync-data": { id: string };
};

describe("queue client", () => {
  beforeEach(() => {
    resetQueueRuntimeForTests();
    resetQueueClientForTests();
  });

  it("enqueues and processes jobs", async () => {
    await configureQueueApp({} as never, {
      provider: { type: "test" },
      retry: { maxAttempts: 2, initialBackoffMs: 1, maxBackoffMs: 1 },
    });

    const queue = getQueueClient<TestJobs>();
    await queue.enqueue("send-email", { to: "user@example.com" });

    const processed: string[] = [];
    const result = await queue.process({
      "send-email": async (payload) => {
        processed.push(payload.to);
      },
    });

    expect(result.processed).toBe(1);
    expect(processed).toEqual(["user@example.com"]);
  });

  it("deduplicates by idempotency key", async () => {
    await configureQueueApp({} as never, {
      provider: { type: "test" },
    });

    const queue = getQueueClient<TestJobs>();
    const first = await queue.enqueue("sync-data", { id: "1" }, { idempotencyKey: "sync-1" });
    const second = await queue.enqueue("sync-data", { id: "1" }, { idempotencyKey: "sync-1" });
    expect(second.id).toBe(first.id);
  });

  it("retries retryable failures and dead-letters permanent failures", async () => {
    await configureQueueApp({} as never, {
      provider: { type: "test" },
      retry: { maxAttempts: 2, initialBackoffMs: 1, maxBackoffMs: 1 },
    });

    const queue = getQueueClient<TestJobs>();
    await queue.enqueue("sync-data", { id: "x" });

    let attempts = 0;
    await queue.process({
      "sync-data": async () => {
        attempts += 1;
        throw new OtokQueueJobError("temporary", true);
      },
    });
    expect(attempts).toBe(1);

    const second = await queue.process({
      "sync-data": async () => {
        attempts += 1;
        throw new OtokQueueJobError("temporary", true);
      },
    });
    expect(attempts).toBe(2);
    expect(second.deadLettered).toBe(1);
  });

  it("schedules cron jobs", async () => {
    await configureQueueApp({} as never, {
      provider: { type: "test" },
      cron: [{ name: "hourly", cron: "* * * * *", jobName: "sync-data", payload: { id: "cron" } }],
    });

    const queue = getQueueClient<TestJobs>();
    const jobs = await queue.tickCron(new Date("2026-01-01T12:00:00.000Z"));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.name).toBe("sync-data");
  });
});

describe("cron matcher", () => {
  it("matches every-minute patterns", async () => {
    const { cronMatches } = await import("./utils.js");
    expect(cronMatches("* * * * *", new Date("2026-01-01T12:34:00Z"))).toBe(true);
    expect(cronMatches("34 12 * * *", new Date("2026-01-01T12:34:00Z"))).toBe(true);
    expect(cronMatches("0 12 * * *", new Date("2026-01-01T12:34:00Z"))).toBe(false);
  });
});
