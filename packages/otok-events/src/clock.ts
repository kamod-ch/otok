import type { Clock } from "./types.js";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Deterministic clock for tests. */
export class FakeClock implements Clock {
  private current: Date;
  private pending: Array<{ at: number; resolve: () => void }> = [];

  constructor(initial: Date | string = "2026-01-01T00:00:00.000Z") {
    this.current = typeof initial === "string" ? new Date(initial) : new Date(initial.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date | string): void {
    this.current = typeof date === "string" ? new Date(date) : new Date(date.getTime());
    this.flushTimers();
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
    this.flushTimers();
  }

  async sleep(ms: number): Promise<void> {
    const target = this.current.getTime() + ms;
    await new Promise<void>((resolve) => {
      this.pending.push({ at: target, resolve });
      this.flushTimers();
    });
  }

  private flushTimers(): void {
    const now = this.current.getTime();
    const ready = this.pending.filter((t) => t.at <= now);
    this.pending = this.pending.filter((t) => t.at > now);
    for (const timer of ready) timer.resolve();
  }
}

export const systemClock = new SystemClock();
