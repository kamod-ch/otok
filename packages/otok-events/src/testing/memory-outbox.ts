import { randomUUID } from "node:crypto";
import type { ClaimedOutboxRecord, LeasedOutboxStore, OutboxRecord, OutboxStore } from "../types.js";
import { DEFAULT_OUTBOX_LEASE_MS, OutboxLeaseError } from "../types.js";

interface MemoryRow extends OutboxRecord {
  leaseToken?: string;
  leaseExpiresAt?: string;
}

function assertNoActiveLease(record: MemoryRow | undefined, operation: string): void {
  if (record?.status === "processing" && record.leaseToken) {
    throw new OutboxLeaseError(`outbox ${operation}: active lease on ${record.id}; use leased store methods`);
  }
}

/** In-memory outbox for tests — supports transactional scoping via clone/snapshot. */
export class MemoryOutboxStore implements OutboxStore, LeasedOutboxStore {
  readonly records: MemoryRow[] = [];

  async insert(record: Omit<OutboxRecord, "status" | "attempts" | "processedAt" | "lastError">): Promise<void> {
    this.records.push({
      ...record,
      status: "pending",
      attempts: 0,
    });
  }

  private claimable(nowIso: string, record: MemoryRow): boolean {
    if (record.status === "pending" && record.availableAt <= nowIso) return true;
    if (
      record.status === "processing" &&
      record.leaseExpiresAt &&
      record.leaseExpiresAt <= nowIso
    ) {
      return true;
    }
    return false;
  }

  async claimPending(limit: number, now = new Date()): Promise<OutboxRecord[]> {
    const nowIso = now.toISOString();
    const pending = this.records.filter((r) => r.status === "pending" && r.availableAt <= nowIso);
    const claimed = pending.slice(0, limit);
    for (const record of claimed) {
      record.status = "processing";
      record.attempts += 1;
      record.leaseToken = undefined;
      record.leaseExpiresAt = undefined;
    }
    return claimed.map((r) => ({ ...r }));
  }

  async claimLeased(limit: number, now = new Date(), leaseMs = DEFAULT_OUTBOX_LEASE_MS): Promise<ClaimedOutboxRecord[]> {
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + leaseMs).toISOString();
    const claimed: ClaimedOutboxRecord[] = [];
    const ordered = [...this.records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const record of ordered) {
      if (claimed.length >= limit) break;
      if (!this.claimable(nowIso, record)) continue;

      const token = randomUUID();
      record.status = "processing";
      record.attempts += 1;
      record.leaseToken = token;
      record.leaseExpiresAt = expiresIso;
      claimed.push({
        ...record,
        leaseToken: token,
        leaseExpiresAt: expiresIso,
      });
    }
    return claimed;
  }

  async renewLease(id: string, leaseToken: string, leaseMs = DEFAULT_OUTBOX_LEASE_MS, now = new Date()): Promise<boolean> {
    const record = this.records.find((r) => r.id === id);
    if (!record || record.leaseToken !== leaseToken || record.status !== "processing") return false;
    const nowIso = now.toISOString();
    if (!record.leaseExpiresAt || record.leaseExpiresAt <= nowIso) return false;
    record.leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();
    return true;
  }

  async markPublished(id: string, processedAt?: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    assertNoActiveLease(record, "markPublished");
    if (record) {
      record.status = "published";
      record.processedAt = processedAt ?? new Date().toISOString();
      record.leaseToken = undefined;
      record.leaseExpiresAt = undefined;
    }
  }

  async markPublishedLeased(id: string, leaseToken: string, processedAt?: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (!record || record.leaseToken !== leaseToken || record.status !== "processing") {
      throw new OutboxLeaseError();
    }
    record.status = "published";
    record.processedAt = processedAt ?? new Date().toISOString();
    record.leaseToken = undefined;
    record.leaseExpiresAt = undefined;
  }

  async markFailed(id: string, error: string, availableAt: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    assertNoActiveLease(record, "markFailed");
    if (record) {
      record.status = "pending";
      record.lastError = error;
      record.availableAt = availableAt;
      record.leaseToken = undefined;
      record.leaseExpiresAt = undefined;
    }
  }

  async markFailedLeased(id: string, leaseToken: string, error: string, availableAt: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (!record || record.leaseToken !== leaseToken || record.status !== "processing") {
      throw new OutboxLeaseError();
    }
    record.status = "pending";
    record.lastError = error;
    record.availableAt = availableAt;
    record.leaseToken = undefined;
    record.leaseExpiresAt = undefined;
  }

  async markDead(id: string, error: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    assertNoActiveLease(record, "markDead");
    if (record) {
      record.status = "dead";
      record.lastError = error;
      record.leaseToken = undefined;
      record.leaseExpiresAt = undefined;
    }
  }

  async markDeadLeased(id: string, leaseToken: string, error: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (!record || record.leaseToken !== leaseToken || record.status !== "processing") {
      throw new OutboxLeaseError();
    }
    record.status = "dead";
    record.lastError = error;
    record.leaseToken = undefined;
    record.leaseExpiresAt = undefined;
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
