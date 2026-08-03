export { defineEvent, eventKey, isEventDefinition, z } from "./define-event.js";
export type {
  DomainEvent,
  EventDefinition,
  EventMetadata,
  EventHandler,
  EventBus,
  HandlerOptions,
  HandlerMode,
  PublishOptions,
  RetryPolicy,
  OutboxRecord,
  OutboxStatus,
  DeadLetterRecord,
  DeadLetterStore,
  IdempotencyStore,
  OutboxStore,
  Clock,
  ObservabilityHooks,
  EventContext,
  InferEventPayload,
} from "./types.js";
export { DEFAULT_RETRY_POLICY } from "./types.js";

export { createCorrelationId, getEventContext, withEventContext, withRequestId, childEventMetadata, metadataFromContext } from "./context.js";
export { redactPayload, redactEvent, safeEventForLog } from "./redaction.js";
export { FakeClock, SystemClock, systemClock } from "./clock.js";
export { resolveRetryPolicy, withRetry, retryDelay } from "./retry.js";

export { InProcessEventBus, createEventBus } from "./bus/event-bus.js";
export type { InProcessEventBusOptions } from "./bus/event-bus.js";

export { enqueueOutboxEvent, OutboxProcessor } from "./outbox/processor.js";
export type { OutboxProcessorDeps } from "./outbox/processor.js";

export { events, getEventsRuntime, tryGetEventsRuntime, registerEventsRuntime, resetEventsRuntimeForTests } from "./registry.js";

export { crmEvents, companyCreated, registerCrmEventHandlers } from "./crm/index.js";
export type { CompanyCreated, CrmHandlerDeps } from "./crm/index.js";
