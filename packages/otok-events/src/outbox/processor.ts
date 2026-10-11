import type { ClaimedOutboxRecord, EventDefinition, OutboxRecord, OutboxStore } from "../types.js";
import { DEFAULT_OUTBOX_LEASE_MS, isLeasedOutboxStore, OutboxLeaseError } from "../types.js";
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
  /** Processing lease duration for leased stores (multi-worker safe). */
  leaseMs?: number;
}

/** Poll outbox and publish committed events to the in-process bus. */
export class OutboxProcessor {
  private readonly store: OutboxStore;
  private readonly bus: InProcessEventBus;
  private readonly definitions: Map<string, EventDefinition>;
  private readonly clock: Clock;
  private readonly maxAttempts: number;
  private readonly batchSize: number;
  private readonly leaseMs: number;

  constructor(deps: OutboxProcessorDeps) {
    this.store = deps.store;
    this.bus = deps.bus;
    this.definitions = deps.definitions;
    this.clock = deps.clock ?? systemClock;
    this.maxAttempts = deps.maxAttempts ?? 5;
    this.batchSize = deps.batchSize ?? 25;
    this.leaseMs = deps.leaseMs ?? DEFAULT_OUTBOX_LEASE_MS;
  }

  async processOnce(): Promise<{ published: number; failed: number; dead: number }> {
    if (isLeasedOutboxStore(this.store)) {
      return this.processOnceLeased(this.store);
    }
    return this.processOnceLegacy();
  }

  private async processOnceLegacy(): Promise<{ published: number; failed: number; dead: number }> {
    const pending = await this.store.claimPending(this.batchSize, this.clock.now());
    let published = 0;
    let failed = 0;
    let dead = 0;

    for (const record of pending) {
      const outcome = await this.handleRecord(record, {
        markPublished: (id, at) => this.store.markPublished(id, at),
        markFailed: (id, err, at) => this.store.markFailed(id, err, at),
        markDead: (id, err) => this.store.markDead(id, err),
      });
      published += outcome.published;
      failed += outcome.failed;
      dead += outcome.dead;
    }

    return { published, failed, dead };
  }

  private async processOnceLeased(store: import("../types.js").LeasedOutboxStore): Promise<{
    published: number;
    failed: number;
    dead: number;
  }> {
    const pending = await store.claimLeased(this.batchSize, this.clock.now(), this.leaseMs);
    let published = 0;
    let failed = 0;
    let dead = 0;

    const renewEveryMs = Math.max(50, Math.floor(this.leaseMs / 3));
    const active = new Map<string, string>();
    for (const record of pending) {
      active.set(record.id, record.leaseToken);
    }

    let renewTimer: ReturnType<typeof setInterval> | undefined;
    if (pending.length > 0) {
      renewTimer = setInterval(() => {
        const now = this.clock.now();
        for (const [id, token] of active) {
          void store.renewLease(id, token, this.leaseMs, now);
        }
      }, renewEveryMs);
    }

    try {
      for (const record of pending) {
        const outcome = await this.handleRecord(record, {
          markPublished: (id, at) => store.markPublishedLeased(id, record.leaseToken, at),
          markFailed: (id, err, at) => store.markFailedLeased(id, record.leaseToken, err, at),
          markDead: (id, err) => store.markDeadLeased(id, record.leaseToken, err),
        });
        active.delete(record.id);
        published += outcome.published;
        failed += outcome.failed;
        dead += outcome.dead;
      }
    } finally {
      if (renewTimer !== undefined) clearInterval(renewTimer);
    }

    return { published, failed, dead };
  }

  private async handleRecord(
    record: OutboxRecord | ClaimedOutboxRecord,
    marks: {
      markPublished: (id: string, processedAt: string) => Promise<void>;
      markFailed: (id: string, error: string, availableAt: string) => Promise<void>;
      markDead: (id: string, error: string) => Promise<void>;
    },
  ): Promise<{ published: number; failed: number; dead: number }> {
    const key = `${record.eventName}@v${record.eventVersion}`;
    const definition = this.definitions.get(key);
    if (!definition) {
      try {
        await marks.markDead(record.id, `Unknown event definition: ${key}`);
        return { published: 0, failed: 0, dead: 1 };
      } catch (error) {
        if (error instanceof OutboxLeaseError) return { published: 0, failed: 0, dead: 0 };
        throw error;
      }
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
      try {
        await marks.markPublished(record.id, this.clock.now().toISOString());
        return { published: 1, failed: 0, dead: 0 };
      } catch (error) {
        if (error instanceof OutboxLeaseError) return { published: 0, failed: 0, dead: 0 };
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (record.attempts >= this.maxAttempts) {
        try {
          await marks.markDead(record.id, message);
          return { published: 0, failed: 0, dead: 1 };
        } catch (leaseError) {
          if (leaseError instanceof OutboxLeaseError) return { published: 0, failed: 0, dead: 0 };
          throw leaseError;
        }
      }
      const policy = resolveRetryPolicy();
      const delay = retryDelay(policy, record.attempts);
      const availableAt = new Date(this.clock.now().getTime() + delay).toISOString();
      try {
        await marks.markFailed(record.id, message, availableAt);
        return { published: 0, failed: 1, dead: 0 };
      } catch (leaseError) {
        if (leaseError instanceof OutboxLeaseError) return { published: 0, failed: 0, dead: 0 };
        throw leaseError;
      }
    }
  }
}
