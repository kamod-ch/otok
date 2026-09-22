import { IDEMPOTENCY_MAX_STORED_RESPONSE_BYTES, type SerializedIdempotencyResponse } from "./types.js";

export function responseHasSetCookie(response: Response): boolean {
  return response.headers.getSetCookie?.().length > 0 || response.headers.has("set-cookie");
}

export async function serializeIdempotencyResponse(
  response: Response,
  retryable: boolean,
): Promise<SerializedIdempotencyResponse | undefined> {
  if (responseHasSetCookie(response)) return undefined;
  const clone = response.clone();
  const buffer = new Uint8Array(await clone.arrayBuffer());
  if (buffer.byteLength > IDEMPOTENCY_MAX_STORED_RESPONSE_BYTES) return undefined;

  const headers: Array<[string, string]> = [];
  clone.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    headers.push([key, value]);
  });

  return {
    status: clone.status,
    statusText: clone.statusText,
    headers,
    body: buffer,
    retryable,
  };
}

export function deserializeIdempotencyResponse(stored: SerializedIdempotencyResponse): Response {
  const headers = new Headers(stored.headers);
  headers.set("x-otok-idempotency", "replay");
  return new Response(stored.body.slice(), {
    status: stored.status,
    statusText: stored.statusText,
    headers,
  });
}

export function idempotencyConflictResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 409,
      message: "Idempotency key was already used with a different request payload.",
    }),
    {
      status: 409,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export function invalidIdempotencyKeyResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 400,
      message: "Invalid X-Otok-Idempotency-Key.",
    }),
    {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export function idempotencyPayloadErrorResponse(code: string, message: string): Response {
  return new Response(JSON.stringify({ status: 400, code, message }), {
    status: 400,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
