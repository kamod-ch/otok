import type { ActionMethod } from "../action-method.js";

export const IDEMPOTENCY_TTL_MS = 86_400_000;
export const IDEMPOTENCY_WAIT_MS = 60_000;
export const IDEMPOTENCY_MAX_ENTRIES = 500;
export const IDEMPOTENCY_MAX_BODY_BYTES = 256 * 1024;
export const IDEMPOTENCY_MAX_STORED_RESPONSE_BYTES = 512 * 1024;
export const IDEMPOTENCY_MAX_FORM_FIELDS = 128;

export type IdempotencyRecordState = "pending" | "completed" | "error";

export interface IdempotencyScope {
  routeId: string;
  routePath: string;
  method: ActionMethod;
  userId?: string;
  tenantId?: string;
  /** Explicit anonymous bucket — never a single global namespace. */
  anonymousBucket: string;
}

export interface SerializedIdempotencyResponse {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: Uint8Array;
  retryable: boolean;
}

export interface IdempotencyBeginResult {
  kind: "leader" | "replay" | "wait" | "conflict";
  response?: Response;
}

export interface IdempotencyStore {
  readonly name: string;
  /** Process-local only for memory implementations — not durable across instances. */
  readonly durability: "process-local" | "durable";
  begin(storageKey: string, fingerprint: string, ttlMs: number): Promise<IdempotencyBeginResult>;
  complete(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
  ): Promise<void>;
  fail(storageKey: string, fingerprint: string, response: SerializedIdempotencyResponse, ttlMs: number): Promise<void>;
  releasePending(storageKey: string, fingerprint: string): Promise<void>;
  waitForLeader(storageKey: string, fingerprint: string, timeoutMs: number): Promise<Response>;
}

export function encodeIdempotencyScopeKey(scope: IdempotencyScope): string {
  const parts = ["v1", scope.method, `rid:${scope.routeId}`, `rp:${scope.routePath}`];
  if (scope.userId) parts.push(`u:${scope.userId}`);
  if (scope.tenantId) parts.push(`t:${scope.tenantId}`);
  if (!scope.userId) parts.push(`a:${scope.anonymousBucket}`);
  return parts.join("|");
}

export function buildStorageKey(scopeKey: string, clientKey: string): string {
  return `${scopeKey}|k:${clientKey}`;
}
