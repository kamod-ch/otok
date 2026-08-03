import type { OutboxRecord, OutboxStore } from "../types.js";

/** In-memory outbox for tests — supports transactional scoping via clone/snapshot. */
export class MemoryOutboxStore implements OutboxStore {
  readonly records: OutboxRecord[] = [];

  async insert(record: Omit<OutboxRecord, "status" | "attempts" | "processedAt" | "lastError">): Promise<void> {
    this.records.push({
      ...record,
      status: "pending",
      attempts: 0,
    });
  }

  async claimPending(limit: number, now = new Date()): Promise<OutboxRecord[]> {
    const pending = this.records.filter(
      (r) => r.status === "pending" && r.availableAt <= now.toISOString(),
    );
    const claimed = pending.slice(0, limit);
    for (const record of claimed) {
      record.status = "processing";
      record.attempts += 1;
    }
    return claimed.map((r) => ({ ...r }));
  }

  async markPublished(id: string, processedAt?: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) {
      record.status = "published";
      record.processedAt = processedAt ?? new Date().toISOString();
    }
  }

  async markFailed(id: string, error: string, availableAt: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) {
      record.status = "pending";
      record.lastError = error;
      record.availableAt = availableAt;
    }
  }

  async markDead(id: string, error: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) {
      record.status = "dead";
      record.lastError = error;
    }
  }

  clone(): MemoryOutboxStore {
    const copy = new MemoryOutboxStore();
    copy.records.push(...this.records.map((r) => ({ ...r })));
    return copy;
  }
}

/** Simulate a DB transaction: commit merges outbox writes, rollback discards them. */
export async function withOutboxTransaction<T>(
  parent: MemoryOutboxStore,
  fn: (trx: MemoryOutboxStore) => Promise<T>,
): Promise<T> {
  const trx = new MemoryOutboxStore();
  const result = await fn(trx);
  parent.records.push(...trx.records);
  return result;
}

export async function withOutboxTransactionRollback<T>(
  parent: MemoryOutboxStore,
  fn: (trx: MemoryOutboxStore) => Promise<T>,
): Promise<T> {
  const trx = new MemoryOutboxStore();
  return fn(trx);
}
