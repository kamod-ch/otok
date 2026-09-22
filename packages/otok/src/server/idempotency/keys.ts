const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 256;
const KEY_PATTERN = /^[\w-:.+@]{8,256}$/;

export function resolveIdempotencyKey(request: Request, formData?: FormData): string | undefined {
  const header = request.headers.get("x-otok-idempotency-key");
  if (header) {
    const trimmed = header.trim();
    return trimmed || undefined;
  }
  const field = formData?.get("_idempotency");
  if (typeof field === "string" && field.trim()) return field.trim();
  return undefined;
}

export function validateIdempotencyClientKey(key: string): boolean {
  if (key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) return false;
  return KEY_PATTERN.test(key);
}
