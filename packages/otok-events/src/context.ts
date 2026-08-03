import { AsyncLocalStorage } from "node:async_hooks";
import type { DomainEvent, EventContext } from "./types.js";

const storage = new AsyncLocalStorage<EventContext>();

/** Run fn with event context (correlation, causation, request id). */
export function withEventContext<T>(context: EventContext, fn: () => T): T {
  const parent = storage.getStore();
  return storage.run(
    {
      correlationId: context.correlationId,
      causationId: context.causationId ?? parent?.causationId,
      requestId: context.requestId ?? parent?.requestId,
      actorId: context.actorId ?? parent?.actorId,
    },
    fn,
  );
}

export function getEventContext(): EventContext | undefined {
  return storage.getStore();
}

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function metadataFromContext(
  overrides: Partial<EventContext & { idempotencyKey?: string }> = {},
): EventContext & { idempotencyKey?: string } {
  const current = getEventContext();
  return {
    correlationId: overrides.correlationId ?? current?.correlationId ?? createCorrelationId(),
    causationId: overrides.causationId ?? current?.causationId,
    requestId: overrides.requestId ?? current?.requestId,
    actorId: overrides.actorId ?? current?.actorId,
    idempotencyKey: overrides.idempotencyKey,
  };
}

/** Bridge otok-observability request id into event context. */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  const ctx = getEventContext();
  return withEventContext(
    {
      correlationId: ctx?.correlationId ?? createCorrelationId(),
      causationId: ctx?.causationId,
      requestId,
      actorId: ctx?.actorId,
    },
    fn,
  );
}

export function childEventMetadata(
  parent: DomainEvent,
  overrides: Partial<EventContext> = {},
): EventContext & { causationId: string } {
  return {
    correlationId: overrides.correlationId ?? parent.metadata.correlationId,
    causationId: overrides.causationId ?? parent.id,
    requestId: overrides.requestId ?? parent.metadata.requestId,
    actorId: overrides.actorId ?? parent.metadata.actorId,
  };
}
