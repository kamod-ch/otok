import type { Clock, EventSink, IdProvider } from "../types/ports.js";

export interface TestClockOptions {
  /** ISO timestamp returned by {@link TestClock.now}. */
  iso?: string;
}

export class TestClock implements Clock {
  private current: Date;

  constructor(options: TestClockOptions = {}) {
    this.current = new Date(options.iso ?? "2026-01-01T00:00:00.000Z");
  }

  now(): Date {
    return new Date(this.current);
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(iso: string): void {
    this.current = new Date(iso);
  }
}

export class TestIdProvider implements IdProvider {
  private seq = 0;

  constructor(private readonly prefix = "test") {}

  createId(kind = "id"): string {
    this.seq += 1;
    return `${this.prefix}_${kind}_${this.seq}`;
  }
}

export class CollectingEventSink implements EventSink {
  readonly events: Parameters<EventSink["emit"]>[0][] = [];

  async emit(event: Parameters<EventSink["emit"]>[0]): Promise<void> {
    this.events.push(structuredClone(event));
  }
}

export function createTestProviders(options: TestClockOptions = {}): {
  clock: TestClock;
  ids: TestIdProvider;
  events: CollectingEventSink;
} {
  return {
    clock: new TestClock(options),
    ids: new TestIdProvider("discussions"),
    events: new CollectingEventSink(),
  };
}
