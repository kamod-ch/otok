import type {
  Clock,
  DeadLetterRecord,
  DeadLetterStore,
  DomainEvent,
  EventBus,
  EventDefinition,
  EventHandler,
  EventMetadata,
  HandlerOptions,
  IdempotencyStore,
  ObservabilityHooks,
  PublishOptions,
} from "../types.js";
import { eventKey } from "../define-event.js";
import { metadataFromContext, withEventContext } from "../context.js";
import { resolveRetryPolicy, withRetry } from "../retry.js";
import { safeEventForLog } from "../redaction.js";
import { systemClock } from "../clock.js";

interface RegisteredHandler {
  definition: EventDefinition;
  handler: EventHandler;
  options: Required<Pick<HandlerOptions, "priority" | "mode">> & HandlerOptions;
}

export interface InProcessEventBusOptions {
  clock?: Clock;
  idempotency?: IdempotencyStore;
  deadLetter?: DeadLetterStore;
  observability?: ObservabilityHooks;
}

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, RegisteredHandler[]>();
  private readonly publishedKeys = new Set<string>();
  private readonly clock: Clock;
  private readonly idempotency?: IdempotencyStore;
  private readonly deadLetter?: DeadLetterStore;
  private readonly observability?: ObservabilityHooks;

  constructor(options: InProcessEventBusOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.idempotency = options.idempotency;
    this.deadLetter = options.deadLetter;
    this.observability = options.observability;
  }

  subscribe<TPayload>(
    definition: EventDefinition<TPayload>,
    handler: EventHandler<TPayload>,
    options: HandlerOptions = {},
  ): () => void {
    const key = eventKey(definition);
    const entry: RegisteredHandler = {
      definition,
      handler: handler as EventHandler,
      options: {
        priority: options.priority ?? 100,
        mode: options.mode ?? "sync",
        ...options,
      },
    };

    const list = this.handlers.get(key) ?? [];
    list.push(entry);
    list.sort((a, b) => a.options.priority - b.options.priority);
    this.handlers.set(key, list);

    return () => {
      const current = this.handlers.get(key) ?? [];
      this.handlers.set(
        key,
        current.filter((h) => h !== entry),
      );
    };
  }

  async publish<TPayload>(
    definition: EventDefinition<TPayload>,
    payload: TPayload,
    options: PublishOptions = {},
  ): Promise<DomainEvent<TPayload>> {
    if (definition.schema) {
      const parsed = definition.schema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(
          `otok-events: invalid payload for ${definition.name}@v${definition.version}: ${parsed.error.message}`,
        );
      }
      payload = parsed.data;
    }

    const ctx = metadataFromContext(options);
    const idempotencyKey = options.idempotencyKey ?? ctx.idempotencyKey;
    if (idempotencyKey && this.publishedKeys.has(idempotencyKey)) {
      throw new Error(`otok-events: duplicate publish idempotency key "${idempotencyKey}"`);
    }

    const event: DomainEvent<TPayload> = {
      id: crypto.randomUUID(),
      name: definition.name,
      version: definition.version,
      payload,
      metadata: {
        correlationId: ctx.correlationId,
        causationId: options.causationId ?? ctx.causationId,
        requestId: options.requestId ?? ctx.requestId,
        idempotencyKey,
        actorId: options.actorId ?? ctx.actorId,
      },
      occurredAt: options.occurredAt ?? this.clock.now().toISOString(),
    };

    if (idempotencyKey) this.publishedKeys.add(idempotencyKey);

    this.observability?.onPublish?.(safeEventForLog(event, definition));

    await withEventContext(
      {
        correlationId: event.metadata.correlationId,
        causationId: event.id,
        requestId: event.metadata.requestId,
        actorId: event.metadata.actorId,
      },
      async () => {
        await this.dispatch(definition, event);
      },
    );

    return event;
  }

  /** Publish a pre-built event (used by outbox processor). */
  async publishRaw<TPayload>(
    definition: EventDefinition<TPayload>,
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    await this.dispatch(definition, event);
  }

  private async dispatch<TPayload>(
    definition: EventDefinition<TPayload>,
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    const list = this.handlers.get(eventKey(definition)) ?? [];
    const syncHandlers = list.filter((h) => h.options.mode === "sync");
    const asyncHandlers = list.filter((h) => h.options.mode === "async");

    for (const entry of syncHandlers) {
      await this.runHandler(entry, event);
    }

    for (const entry of asyncHandlers) {
      void this.runHandler(entry, event);
    }
  }

  private async runHandler(entry: RegisteredHandler, event: DomainEvent): Promise<void> {
    const consumerName = entry.options.consumerName ?? entry.definition.name;
    const idempotencyKey = event.metadata.idempotencyKey;

    if (idempotencyKey && this.idempotency) {
      const processed = await this.idempotency.hasProcessed(consumerName, idempotencyKey);
      if (processed) return;
    }

    const policy = resolveRetryPolicy(entry.options.retry);

    this.observability?.onHandlerStart?.(event, consumerName);

    try {
      if (entry.options.mode === "async") {
        await withRetry(
          () => Promise.resolve(entry.handler(event)),
          policy,
          (ms: number) => this.clock.sleep(ms),
          (error: unknown, attempt: number) => this.observability?.onHandlerError?.(event, error, consumerName),
        );
      } else {
        await entry.handler(event);
      }

      if (idempotencyKey && this.idempotency) {
        await this.idempotency.markProcessed(consumerName, idempotencyKey, this.clock.now().toISOString());
      }

      this.observability?.onHandlerSuccess?.(event, consumerName);
    } catch (error) {
      this.observability?.onHandlerError?.(event, error, consumerName);

      if (this.deadLetter) {
        const record: DeadLetterRecord = {
          id: crypto.randomUUID(),
          eventName: event.name,
          eventVersion: event.version,
          payload: event.payload,
          metadata: event.metadata as EventMetadata,
          error: error instanceof Error ? error.message : String(error),
          failedAt: this.clock.now().toISOString(),
          attempts: policy.maxAttempts,
        };
        await this.deadLetter.append(record);
        this.observability?.onDeadLetter?.(record);
      }

      if (entry.options.mode === "sync") throw error;
    }
  }
}

export function createEventBus(options?: InProcessEventBusOptions): InProcessEventBus {
  return new InProcessEventBus(options);
}
