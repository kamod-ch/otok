import type { IdempotencyStore } from "./types.js";
import { IDEMPOTENCY_TTL_MS, IDEMPOTENCY_WAIT_MS } from "./types.js";
import { MemoryIdempotencyStore } from "./memory-store.js";
import { idempotencyConflictResponse, serializeIdempotencyResponse } from "./serialize.js";

let defaultStore: IdempotencyStore = new MemoryIdempotencyStore();

export function getIdempotencyStore(): IdempotencyStore {
  return defaultStore;
}

export function setIdempotencyStore(store: IdempotencyStore): void {
  defaultStore = store;
}

export function clearIdempotencyStore(): void {
  if (defaultStore instanceof MemoryIdempotencyStore) defaultStore.clear();
}

function shouldPersistResponse(response: Response): boolean {
  if (response.status >= 500) return false;
  return response.ok || (response.status >= 300 && response.status < 400) || response.status === 422;
}

async function finalizeStoredResponse(
  store: IdempotencyStore,
  storageKey: string,
  fingerprint: string,
  response: Response,
): Promise<void> {
  const retryable = response.status >= 500;
  if (shouldPersistResponse(response)) {
    const serialized = await serializeIdempotencyResponse(response, retryable);
    if (serialized) {
      await store.complete(storageKey, fingerprint, serialized, IDEMPOTENCY_TTL_MS);
      return;
    }
    await store.releasePending(storageKey, fingerprint);
    return;
  }
  if (response.status >= 400) {
    const serialized = await serializeIdempotencyResponse(response, false);
    if (serialized) await store.fail(storageKey, fingerprint, serialized, IDEMPOTENCY_TTL_MS);
    else await store.releasePending(storageKey, fingerprint);
    return;
  }
  await store.releasePending(storageKey, fingerprint);
}

export async function runIdempotentAction(
  storageKey: string,
  fingerprint: string,
  factory: () => Promise<Response>,
  store: IdempotencyStore = getIdempotencyStore(),
  canStore: (response: Response) => boolean = () => true,
): Promise<Response> {
  const begin = await store.begin(storageKey, fingerprint, IDEMPOTENCY_TTL_MS);
  if (begin.kind === "conflict") return idempotencyConflictResponse();
  if (begin.kind === "replay" && begin.response) return begin.response;

  if (begin.kind === "wait") {
    return store.waitForLeader(storageKey, fingerprint, IDEMPOTENCY_WAIT_MS);
  }

  const work = async () => {
    try {
      const response = await factory();
      if (!canStore(response)) {
        await store.releasePending(storageKey, fingerprint);
        return response;
      }
      await finalizeStoredResponse(store, storageKey, fingerprint, response);
      return response;
    } catch (error) {
      await store.releasePending(storageKey, fingerprint);
      throw error;
    }
  };

  if (store instanceof MemoryIdempotencyStore) {
    return store.executeLeader(storageKey, fingerprint, work);
  }

  return work();
}

export { buildStorageKey } from "./types.js";
