import type {
  IdempotencyBeginResult,
  IdempotencyRecordState,
  IdempotencyStore,
  SerializedIdempotencyResponse,
} from "./types.js";
import { IDEMPOTENCY_MAX_ENTRIES, IDEMPOTENCY_WAIT_MS } from "./types.js";
import { deserializeIdempotencyResponse } from "./serialize.js";

interface Slot {
  fingerprint: string;
  state: IdempotencyRecordState;
  expiresAt: number;
  stored?: SerializedIdempotencyResponse;
  leader: Promise<Response>;
  resolveLeader: (response: Response) => void;
  rejectLeader: (error: unknown) => void;
}

export interface MemoryIdempotencyStoreOptions {
  now?: () => number;
  maxEntries?: number;
  waitMs?: number;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  readonly name = "memory";
  readonly durability = "process-local" as const;
  private readonly slots = new Map<string, Slot>();
  private readonly now: () => number;
  private readonly maxEntries: number;
  private readonly waitMs: number;

  constructor(options: MemoryIdempotencyStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.maxEntries = options.maxEntries ?? IDEMPOTENCY_MAX_ENTRIES;
    this.waitMs = options.waitMs ?? IDEMPOTENCY_WAIT_MS;
  }

  private prune(): void {
    const now = this.now();
    for (const [key, slot] of this.slots) {
      if (slot.expiresAt <= now) this.slots.delete(key);
    }
    if (this.slots.size <= this.maxEntries) return;
    const overflow = this.slots.size - this.maxEntries;
    const keys = this.slots.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      this.slots.delete(next.value);
    }
  }

  private createPendingSlot(storageKey: string, fingerprint: string, ttlMs: number): Slot {
    let resolveLeader!: (response: Response) => void;
    let rejectLeader!: (error: unknown) => void;
    const leader = new Promise<Response>((resolve, reject) => {
      resolveLeader = resolve;
      rejectLeader = reject;
    });
    const slot: Slot = {
      fingerprint,
      state: "pending",
      expiresAt: this.now() + ttlMs,
      leader,
      resolveLeader,
      rejectLeader,
    };
    this.slots.set(storageKey, slot);
    return slot;
  }

  async begin(storageKey: string, fingerprint: string, ttlMs: number): Promise<IdempotencyBeginResult> {
    this.prune();
    const now = this.now();
    const existing = this.slots.get(storageKey);
    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
      if (existing.state === "completed" && existing.stored) {
        return { kind: "replay", response: deserializeIdempotencyResponse(existing.stored) };
      }
      if (existing.state === "error" && existing.stored) {
        return { kind: "replay", response: deserializeIdempotencyResponse(existing.stored) };
      }
      if (existing.state === "pending") return { kind: "wait" };
    }

    this.createPendingSlot(storageKey, fingerprint, ttlMs);
    return { kind: "leader" };
  }

  async executeLeader(storageKey: string, fingerprint: string, work: () => Promise<Response>): Promise<Response> {
    const slot = this.slots.get(storageKey);
    if (!slot || slot.fingerprint !== fingerprint) {
      throw new Error("[otok:idempotency] Missing leader slot.");
    }
    try {
      const response = await work();
      slot.resolveLeader(response.clone());
      return response.clone();
    } catch (error) {
      slot.rejectLeader(error);
      throw error;
    }
  }

  async complete(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
  ): Promise<void> {
    const slot = this.slots.get(storageKey);
    if (!slot || slot.fingerprint !== fingerprint) return;
    slot.state = "completed";
    slot.stored = response;
    slot.expiresAt = this.now() + ttlMs;
  }

  async fail(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
  ): Promise<void> {
    const slot = this.slots.get(storageKey);
    if (!slot || slot.fingerprint !== fingerprint) return;
    slot.state = "error";
    slot.stored = response;
    slot.expiresAt = this.now() + ttlMs;
  }

  async releasePending(storageKey: string, fingerprint: string): Promise<void> {
    const slot = this.slots.get(storageKey);
    if (!slot || slot.fingerprint !== fingerprint || slot.state !== "pending") return;
    this.slots.delete(storageKey);
  }

  async waitForLeader(storageKey: string, fingerprint: string, timeoutMs = this.waitMs): Promise<Response> {
    const slot = this.slots.get(storageKey);
    if (!slot || slot.fingerprint !== fingerprint) {
      throw new Error("[otok:idempotency] Missing leader promise while waiting.");
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<Response>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("[otok:idempotency] Timed out waiting for idempotent action.")),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([slot.leader, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  clear(): void {
    this.slots.clear();
  }
}
