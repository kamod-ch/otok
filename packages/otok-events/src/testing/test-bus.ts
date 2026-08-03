import type {
  Clock,
  DeadLetterRecord,
  DeadLetterStore,
  DomainEvent,
  EventBus,
  EventDefinition,
  IdempotencyStore,
  ProcessedRecord,
} from "../types.js";
import { InProcessEventBus } from "../bus/event-bus.js";

/** In-memory idempotency store for tests and dev. */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Set<string>();

  async hasProcessed(consumerName: string, idempotencyKey: string): Promise<boolean> {
    return this.records.has(`${consumerName}:${idempotencyKey}`);
  }

  async markProcessed(consumerName: string, idempotencyKey: string): Promise<void> {
    this.records.add(`${consumerName}:${idempotencyKey}`);
  }

  snapshot(): ProcessedRecord[] {
    return [...this.records].map((key) => {
      const [consumerName, idempotencyKey] = key.split(":");
      return { consumerName: consumerName!, idempotencyKey: idempotencyKey!, processedAt: "" };
    });
  }

  clear(): void {
    this.records.clear();
  }
}

/** In-memory dead-letter store. */
export class MemoryDeadLetterStore implements DeadLetterStore {
  readonly records: DeadLetterRecord[] = [];

  async append(record: DeadLetterRecord): Promise<void> {
    this.records.push(record);
  }

  async list(limit = 100): Promise<DeadLetterRecord[]> {
    return this.records.slice(0, limit);
  }
}

export interface TestEventBusOptions {
  clock?: Clock;
  idempotency?: IdempotencyStore;
  deadLetter?: DeadLetterStore;
}

/** Test event bus with helpers to inspect published/handled events. */
export class TestEventBus {
  readonly bus: InProcessEventBus;
  readonly published: DomainEvent[] = [];
  readonly idempotency: MemoryIdempotencyStore;
  readonly deadLetter: MemoryDeadLetterStore;

  constructor(options: TestEventBusOptions = {}) {
    this.idempotency = (options.idempotency as MemoryIdempotencyStore) ?? new MemoryIdempotencyStore();
    this.deadLetter = (options.deadLetter as MemoryDeadLetterStore) ?? new MemoryDeadLetterStore();
    this.bus = new InProcessEventBus({
      clock: options.clock,
      idempotency: this.idempotency,
      deadLetter: this.deadLetter,
      observability: {
        onPublish: (event: DomainEvent) => this.published.push(structuredClone(event)),
      },
    });
  }

  get events(): EventBus {
    return this.bus;
  }

  async publish<TPayload>(
    definition: EventDefinition<TPayload>,
    payload: TPayload,
    options?: Parameters<InProcessEventBus["publish"]>[2],
  ): Promise<DomainEvent<TPayload>> {
    return this.bus.publish(definition, payload, options);
  }

  clear(): void {
    this.published.length = 0;
    this.idempotency.clear();
    this.deadLetter.records.length = 0;
  }
}

export function createTestEventBus(options?: TestEventBusOptions): TestEventBus {
  return new TestEventBus(options);
}
