import type { Context } from "hono";
import type { OtokRoute } from "../shared/routes.js";
import { resolveActionMethod } from "./action-method.js";
import { IdempotencyPayloadError, fingerprintActionPayload } from "./idempotency/fingerprint.js";
import { resolveIdempotencyKey, validateIdempotencyClientKey } from "./idempotency/keys.js";
import { buildIdempotencyScope } from "./idempotency/scope.js";
import {
  clearIdempotencyStore,
  getIdempotencyStore,
  runIdempotentAction,
  setIdempotencyStore,
} from "./idempotency/run.js";
import { idempotencyPayloadErrorResponse, invalidIdempotencyKeyResponse } from "./idempotency/serialize.js";
import { buildStorageKey, encodeIdempotencyScopeKey } from "./idempotency/types.js";

export {
  clearIdempotencyStore,
  getIdempotencyStore,
  setIdempotencyStore,
  resolveIdempotencyKey,
  validateIdempotencyClientKey,
  buildIdempotencyScope,
  encodeIdempotencyScopeKey,
  buildStorageKey,
  fingerprintActionPayload,
  IdempotencyPayloadError,
};
export type { IdempotencyScope, IdempotencyStore } from "./idempotency/types.js";
export { MemoryIdempotencyStore } from "./idempotency/memory-store.js";
export { PostgresIdempotencyStore, IDEMPOTENCY_RECORDS_TABLE } from "./idempotency/postgres-store.js";
export type { IdempotencyDatabase } from "./idempotency/postgres-store.js";
export { IDEMPOTENCY_TTL_MS } from "./idempotency/types.js";

export async function withActionIdempotency(
  c: Context,
  route: OtokRoute,
  formData: FormData | undefined,
  clientKey: string | undefined,
  factory: () => Promise<Response>,
): Promise<Response> {
  if (!clientKey) return factory();
  if (!validateIdempotencyClientKey(clientKey)) return invalidIdempotencyKeyResponse();

  let fingerprint: string;
  try {
    const payload = await fingerprintActionPayload(c.req.raw, formData);
    fingerprint = payload.hash;
  } catch (error) {
    if (error instanceof IdempotencyPayloadError) {
      return idempotencyPayloadErrorResponse(error.code, error.message);
    }
    throw error;
  }

  const method = resolveActionMethod(c.req.method, formData);
  const scopeKey = encodeIdempotencyScopeKey(buildIdempotencyScope(c, route, method));
  const storageKey = buildStorageKey(scopeKey, clientKey);
  return runIdempotentAction(
    storageKey,
    fingerprint,
    factory,
    getIdempotencyStore(),
    () => c.res.headers.getSetCookie().length === 0,
  );
}
