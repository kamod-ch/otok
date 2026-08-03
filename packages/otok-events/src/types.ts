import type { ZodType } from "zod";

/** Metadata propagated with every domain event. */
export interface EventMetadata {
  /** Groups related events in a business flow. */
  correlationId: string;
  /** The event id that directly caused this event. */
  causationId?: string;
  /** HTTP request id from otok-observability when available. */
  requestId?: string;
  /** Idempotency key for deduplicated publishing/consuming. */
  idempotencyKey?: string;
  /** Optional actor identifier (user id, system, etc.). */
  actorId?: string;
}

export interface DomainEvent<TPayload = unknown> {
  id: string;
  name: string;
  version: number;
  payload: TPayload;
  metadata: EventMetadata;
  /** ISO timestamp when the event occurred. */
  occurredAt: string;
}

export interface EventDefinition<TPayload = unknown> {
  readonly __kind: "otok-event";
  readonly name: string;
  readonly version: number;
  readonly schema?: ZodType<TPayload>;
  /** Fields to redact when logging or exporting events. */
  readonly redactFields?: readonly string[];
}

export type InferEventPayload<T> = T extends EventDefinition<infer P> ? P : never;

export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;

export type HandlerMode = "sync" | "async";

export interface HandlerOptions {
  /** Lower runs first. Default 100. */
  priority?: number;
  /** sync: awaited in publish order; async: fire-and-forget with retry. Default sync. */
  mode?: HandlerMode;
  retry?: Partial<RetryPolicy>;
  /** Consumer name for idempotency tracking. */
  consumerName?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 50,
  maxDelayMs: 2_000,
  backoffMultiplier: 2,
};

export interface PublishOptions {
  correlationId?: string;
  causationId?: string;
  requestId?: string;
  idempotencyKey?: string;
  actorId?: string;
  occurredAt?: string;
}

export interface OutboxRecord {
  id: string;
  eventName: string;
  eventVersion: number;
  payload: unknown;
  metadata: EventMetadata;
  status: OutboxStatus;
  attempts: number;
  availableAt: string;
  createdAt: string;
  processedAt?: string;
  lastError?: string;
  idempotencyKey?: string;
}

export type OutboxStatus = "pending" | "processing" | "published" | "failed" | "dead";

export interface DeadLetterRecord {
  id: string;
  eventName: string;
  eventVersion: number;
  payload: unknown;
  metadata: EventMetadata;
  error: string;
  failedAt: string;
  attempts: number;
}

export interface ProcessedRecord {
  consumerName: string;
  idempotencyKey: string;
  processedAt: string;
}

export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}

export interface DeadLetterStore {
  append(record: DeadLetterRecord): Promise<void>;
  list(limit?: number): Promise<DeadLetterRecord[]>;
}

export interface IdempotencyStore {
  hasProcessed(consumerName: string, idempotencyKey: string): Promise<boolean>;
  markProcessed(consumerName: string, idempotencyKey: string, processedAt?: string): Promise<void>;
}

export interface OutboxStore {
  insert(record: Omit<OutboxRecord, "status" | "attempts" | "processedAt" | "lastError">): Promise<void>;
  claimPending(limit: number, now?: Date): Promise<OutboxRecord[]>;
  markPublished(id: string, processedAt?: string): Promise<void>;
  markFailed(id: string, error: string, availableAt: string): Promise<void>;
  markDead(id: string, error: string): Promise<void>;
}

export interface EventBus {
  publish<TPayload>(
    definition: EventDefinition<TPayload>,
    payload: TPayload,
    options?: PublishOptions,
  ): Promise<DomainEvent<TPayload>>;
  subscribe<TPayload>(
    definition: EventDefinition<TPayload>,
    handler: EventHandler<TPayload>,
    options?: HandlerOptions,
  ): () => void;
}

export interface EventContext {
  correlationId: string;
  causationId?: string;
  requestId?: string;
  actorId?: string;
}

export interface ObservabilityHooks {
  onPublish?(event: DomainEvent): void;
  onHandlerStart?(event: DomainEvent, consumerName?: string): void;
  onHandlerSuccess?(event: DomainEvent, consumerName?: string): void;
  onHandlerError?(event: DomainEvent, error: unknown, consumerName?: string): void;
  onDeadLetter?(record: DeadLetterRecord): void;
}
