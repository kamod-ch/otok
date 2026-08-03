import type { EventDefinition, OutboxStore } from "../types.js";
import type { OutboxInsertInput } from "./types.js";
import { InProcessEventBus } from "../bus/event-bus.js";
import type { Clock } from "../types.js";
import { systemClock } from "../clock.js";
import { resolveRetryPolicy, retryDelay } from "../retry.js";

/**
 * Enqueue an event in the same database transaction as business writes.
 * The event is NOT published until the outbox processor runs after commit.
 */
export async function enqueueOutboxEvent(
  store: OutboxStore,
  definition: EventDefinition,
  payload: unknown,
  metadata: OutboxInsertInput["metadata"] & { idempotencyKey?: string },
  clock: Clock = systemClock,
): Promise<string> {
  if (definition.schema) {
    const parsed = definition.schema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`otok-events outbox: invalid payload for ${definition.name}: ${parsed.error.message}`);
    }
    payload = parsed.data;
  }

  const id = crypto.randomUUID();
  const now = clock.now().toISOString();

  await store.insert({
    id,
    eventName: definition.name,
    eventVersion: definition.version,
    payload,
    metadata: {
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      requestId: metadata.requestId,
      actorId: metadata.actorId,
      idempotencyKey: metadata.idempotencyKey,
    },
    availableAt: now,
    createdAt: now,
    idempotencyKey: metadata.idempotencyKey,
  });

  return id;
}

export interface OutboxProcessorDeps {
  store: OutboxStore;
  bus: InProcessEventBus;
  definitions: Map<string, EventDefinition>;
  clock?: Clock;
  maxAttempts?: number;
  batchSize?: number;
}

/** Poll outbox and publish committed events to the in-process bus. */
export class OutboxProcessor {
  private readonly store: OutboxStore;
  private readonly bus: InProcessEventBus;
  private readonly definitions: Map<string, EventDefinition>;
  private readonly clock: Clock;
  private readonly maxAttempts: number;
  private readonly batchSize: number;

  constructor(deps: OutboxProcessorDeps) {
    this.store = deps.store;
    this.bus = deps.bus;
    this.definitions = deps.definitions;
    this.clock = deps.clock ?? systemClock;
    this.maxAttempts = deps.maxAttempts ?? 5;
    this.batchSize = deps.batchSize ?? 25;
  }

  async processOnce(): Promise<{ published: number; failed: number; dead: number }> {
    const pending = await this.store.claimPending(this.batchSize, this.clock.now());
    let published = 0;
    let failed = 0;
    let dead = 0;

    for (const record of pending) {
      const key = `${record.eventName}@v${record.eventVersion}`;
      const definition = this.definitions.get(key);
      if (!definition) {
        await this.store.markDead(record.id, `Unknown event definition: ${key}`);
        dead++;
        continue;
      }

      try {
        await this.bus.publishRaw(definition, {
          id: record.id,
          name: record.eventName,
          version: record.eventVersion,
          payload: record.payload,
          metadata: record.metadata,
          occurredAt: record.createdAt,
        });
        await this.store.markPublished(record.id, this.clock.now().toISOString());
        published++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const nextAttempt = record.attempts + 1;
        if (nextAttempt >= this.maxAttempts) {
          await this.store.markDead(record.id, message);
          dead++;
        } else {
          const policy = resolveRetryPolicy();
          const delay = retryDelay(policy, nextAttempt);
          const availableAt = new Date(this.clock.now().getTime() + delay).toISOString();
          await this.store.markFailed(record.id, message, availableAt);
          failed++;
        }
      }
    }

    return { published, failed, dead };
  }
}
