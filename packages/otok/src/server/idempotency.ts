interface IdempotencyEntry {
  response: Response;
  expiresAt: number;
}

const store = new Map<string, IdempotencyEntry>();
const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 500;

function prune(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size <= MAX_ENTRIES) return;
  const overflow = store.size - MAX_ENTRIES;
  const keys = store.keys();
  for (let i = 0; i < overflow; i++) {
    const next = keys.next();
    if (next.done) break;
    store.delete(next.value);
  }
}

export function resolveIdempotencyKey(request: Request, formData?: FormData): string | undefined {
  const header = request.headers.get("x-otok-idempotency-key");
  if (header) return header.trim() || undefined;
  const field = formData?.get("_idempotency");
  if (typeof field === "string" && field.trim()) return field.trim();
  return undefined;
}

export function getIdempotentResponse(key: string): Response | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.response.clone();
}

export function storeIdempotentResponse(key: string, response: Response, ttlMs = DEFAULT_TTL_MS): void {
  prune();
  store.set(key, {
    response: response.clone(),
    expiresAt: Date.now() + ttlMs,
  });
}

export async function withIdempotency(
  key: string | undefined,
  factory: () => Promise<Response>,
): Promise<Response> {
  if (!key) return factory();

  const cached = getIdempotentResponse(key);
  if (cached) return cached;

  const response = await factory();
  if (response.ok || (response.status >= 300 && response.status < 400)) {
    storeIdempotentResponse(key, response);
  }
  return response;
}

/** Test helper — clears the in-memory idempotency store. */
export function clearIdempotencyStore(): void {
  store.clear();
}
